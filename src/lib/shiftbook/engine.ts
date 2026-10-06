// Shiftbook pay engine. Pure functions shared by the app and the calendar feed.
// Dates are wall-clock: "YYYY-MM-DD" + "HH:MM" strings parsed in the runtime's local zone.

export type Template = { dow: number; start: string; end: string };

export type Settings = {
  rate: number;
  vacPct: number;
  periodLen: number;
  anchor: string;
  paydayOffset: number;
  paydayDow: number | null;
  paydayLag: number;
  otWeek: boolean;
  otDay: boolean;
  sleepOn: boolean;
  sleepStart: string;
  sleepEnd: string;
  net: boolean;
  cpp: number;
  ei: number;
  taxOverride: number | null;
  theme: "auto" | "light" | "dark";
  tz?: string;
  templates: Template[];
};

export type Shift = {
  id: string;
  date: string;
  start: string;
  end: string;
  rate: number | null;
  note: string;
  skip: boolean;
};

export type ShiftbookState = { settings: Settings; shifts: Shift[] };

export type ShiftPay = {
  hours: number;
  onsite: number;
  regular: number;
  ot: number;
  base: number;
  pay: number;
  rate: number;
};

export const DEFAULTS: Settings = {
  rate: 0,
  vacPct: 4,
  periodLen: 14,
  anchor: "2026-08-30",
  paydayOffset: 5,
  paydayDow: 5,
  paydayLag: 0,
  otWeek: false,
  otDay: false,
  sleepOn: false,
  sleepStart: "02:00",
  sleepEnd: "08:00",
  net: true,
  cpp: 5.95,
  ei: 1.63,
  taxOverride: null,
  theme: "auto",
  templates: [],
};

export const DAY = 86400000;
const pad = (n: number) => String(n).padStart(2, "0");

export function ymd(d: Date) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
export function parseYmd(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function normalize(raw: unknown): ShiftbookState {
  const s = (raw && typeof raw === "object" ? raw : {}) as Partial<ShiftbookState>;
  const st: Settings = Object.assign({}, DEFAULTS, s.settings || {});
  if (!Array.isArray(st.templates)) st.templates = [];
  st.templates = st.templates.map((t) => ({ ...t }));
  const shifts = Array.isArray(s.shifts)
    ? s.shifts.filter((x) => x && x.date && x.start && x.end)
    : [];
  return { settings: st, shifts };
}

export function shiftBounds(sh: Pick<Shift, "date" | "start" | "end">) {
  const start = new Date(sh.date + "T" + sh.start + ":00");
  let end = new Date(sh.date + "T" + sh.end + ":00");
  if (end <= start) end = new Date(end.getTime() + DAY);
  return { start, end };
}

export function hoursBetween(a: Date | number, b: Date | number) {
  return Math.max(0, (+b - +a) / 3600000);
}

export function sleepWindows(a: Date, b: Date, st: Settings) {
  if (!st.sleepOn || !st.sleepStart || !st.sleepEnd) return [] as { start: Date; end: Date }[];
  const out: { start: Date; end: Date }[] = [];
  const d0 = parseYmd(ymd(a));
  d0.setDate(d0.getDate() - 1);
  const d1 = parseYmd(ymd(b));
  for (let d = new Date(d0); d <= d1; d.setDate(d.getDate() + 1)) {
    const key = ymd(d);
    const ws = new Date(key + "T" + st.sleepStart + ":00");
    let we = new Date(key + "T" + st.sleepEnd + ":00");
    if (we <= ws) we = new Date(we.getTime() + DAY);
    const s = Math.max(+ws, +a);
    const e = Math.min(+we, +b);
    if (e > s) out.push({ start: new Date(s), end: new Date(e) });
  }
  return out;
}

export function paidHours(a: Date, b: Date, st: Settings) {
  if (b <= a) return 0;
  let h = hoursBetween(a, b);
  for (const w of sleepWindows(a, b, st)) h -= hoursBetween(w.start, w.end);
  return Math.max(0, h);
}

export function inSleep(t: Date, st: Settings) {
  return sleepWindows(new Date(t.getTime() - 1), new Date(t.getTime() + 1), st).length > 0;
}

/* pay periods */
export function periodOf(date: Date, st: Settings) {
  const L = Number(st.periodLen) || 14;
  const anchor = parseYmd(st.anchor || DEFAULTS.anchor);
  const d0 = parseYmd(ymd(date));
  const k = Math.floor((+d0 - +anchor) / (L * DAY));
  const start = new Date(anchor.getTime() + k * L * DAY);
  const end = new Date(start.getTime() + L * DAY); // exclusive
  return { start, end, key: ymd(start) };
}
export type Period = ReturnType<typeof periodOf>;

export function paydayOf(p: Period, st: Settings) {
  if (st.paydayDow == null || (st.paydayDow as unknown) === "") {
    return new Date(p.end.getTime() + (Number(st.paydayOffset) || 0) * DAY);
  }
  const dow = Number(st.paydayDow);
  const d = new Date(p.end.getTime());
  const ahead = (dow - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + ahead + 7 * (Number(st.paydayLag) || 0));
  return d;
}

/** Per-shift pay counted up to `cutoff` (a Date, or Infinity for the whole shift). */
export function computePay(
  shifts: Pick<Shift, "id" | "date" | "start" | "end" | "rate" | "skip">[],
  st: Settings,
  cutoff: Date | number
): Record<string, ShiftPay> {
  const rate = Number(st.rate) || 0;
  const vac = 1 + (Number(st.vacPct) || 0) / 100;
  const sorted = shifts.slice().sort((a, b) => +shiftBounds(a).start - +shiftBounds(b).start);
  const weekReg: Record<string, number> = {};
  const out: Record<string, ShiftPay> = {};
  const whole = cutoff === Infinity;
  for (const sh of sorted) {
    const { start, end } = shiftBounds(sh);
    const cut = whole ? end : new Date(Math.min(+end, +cutoff));
    let h = sh.skip ? 0 : paidHours(start, cut, st);
    if (!whole && cut <= start) h = 0;
    const onsite = sh.skip ? 0 : hoursBetween(start, whole ? end : cut);
    const r =
      sh.rate != null && (sh.rate as unknown) !== "" && !isNaN(Number(sh.rate)) ? Number(sh.rate) : rate;
    const dayOT = st.otDay ? Math.max(0, h - 8) : 0;
    let reg = h - dayOT;
    let wkOT = 0;
    if (st.otWeek) {
      const wk = ymd(new Date(start.getTime() - start.getDay() * DAY));
      const before = weekReg[wk] || 0;
      const room = Math.max(0, 40 - before);
      if (reg > room) {
        wkOT = reg - room;
        reg = room;
      }
      weekReg[wk] = before + reg;
    }
    const ot = dayOT + wkOT;
    const base = r * reg + r * 1.5 * ot;
    out[sh.id] = { hours: h, onsite, regular: reg, ot, base, pay: base * vac, rate: r };
  }
  return out;
}

/* Deductions estimate for one period's gross (approximate 2026 federal + Manitoba). */
const FED: [number, number][] = [
  [58523, 0.14],
  [117045, 0.205],
  [162295, 0.26],
  [231203, 0.29],
  [Infinity, 0.33],
];
const MB: [number, number][] = [
  [47564, 0.108],
  [101200, 0.1275],
  [Infinity, 0.174],
];
const FED_BPA = 16452;
const MB_BPA = 16000;

function bracketTax(annual: number, br: [number, number][]) {
  let t = 0;
  let prev = 0;
  for (const [cap, r] of br) {
    const amt = Math.min(annual, cap) - prev;
    if (amt > 0) t += amt * r;
    prev = cap;
    if (annual <= cap) break;
  }
  return t;
}

export function netEstimate(gross: number, st: Settings) {
  const L = Number(st.periodLen) || 14;
  const N = Math.round(365 / L);
  const cppEx = 3500 / N;
  const cpp = (Math.max(0, gross - cppEx) * (Number(st.cpp) || 0)) / 100;
  const ei = (gross * (Number(st.ei) || 0)) / 100;
  let tax: number;
  if (st.taxOverride != null && (st.taxOverride as unknown) !== "" && !isNaN(Number(st.taxOverride))) {
    tax = (gross * Number(st.taxOverride)) / 100;
  } else {
    const annual = gross * N;
    const fed = Math.max(0, bracketTax(annual, FED) - FED_BPA * 0.14);
    const mb = Math.max(0, bracketTax(annual, MB) - MB_BPA * 0.108);
    tax = (fed + mb) / N;
  }
  return { cpp, ei, tax, net: Math.max(0, gross - cpp - ei - tax) };
}
