// Builds an iCalendar (.ics) feed of someone's shifts for calendar subscriptions.
import { computePay, normalize, shiftBounds, ymd, DAY } from "./engine";

const pad = (n: number) => String(n).padStart(2, "0");

/** Milliseconds the zone is ahead of UTC at instant t. */
function tzOffset(t: number, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(t));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(t / 1000) * 1000;
}

/** Converts a wall-clock date and time in `tz` to a real instant. */
export function wallToUtc(date: string, time: string, tz: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const off1 = tzOffset(guess, tz);
  let utc = guess - off1;
  const off2 = tzOffset(utc, tz);
  if (off2 !== off1) utc = guess - off2;
  return new Date(utc);
}

function stamp(d: Date) {
  return (
    d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" +
    pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + "Z"
  );
}

function escText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds lines longer than 75 octets, as the spec requires. */
function fold(line: string) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let curLen = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (curLen + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      curLen = 0;
    }
    cur += ch;
    curLen += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const money = (v: number) =>
  "$" + (Math.round(v * 100) / 100).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hours = (h: number) => {
  const r = Math.round(h * 100) / 100;
  return (Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0$/, "")) + " h";
};
const hm = (d: Date) => pad(d.getHours()) + ":" + pad(d.getMinutes());

export function buildIcs(raw: unknown, opts: { defaultTz: string; host: string; historyDays?: number }) {
  const state = normalize(raw);
  const st = state.settings;
  const tz = st.tz || opts.defaultTz;
  const pay = computePay(state.shifts, st, Infinity);
  const now = new Date();
  const cutoff = now.getTime() - (opts.historyDays ?? 180) * DAY;
  const vac = Number(st.vacPct) || 0;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//williamsindepth.dev//Shiftbook//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Shifts",
    "X-WR-CALDESC:Shifts from Shiftbook",
    "X-WR-TIMEZONE:" + tz,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const sh of state.shifts) {
    if (sh.skip) continue;
    // Wall-clock end (handles overnight shifts) in the server's zone, then placed in the person's zone.
    const { end } = shiftBounds(sh);
    const startUtc = wallToUtc(sh.date, sh.start, tz);
    const endUtc = wallToUtc(ymd(end), hm(end), tz);
    if (endUtc.getTime() < cutoff) continue;
    const p = pay[sh.id];
    const desc = [
      hours(p.hours) + " paid" + (p.onsite - p.hours > 0.01 ? " of " + hours(p.onsite) + " on site" : ""),
      p.ot > 0 ? hours(p.ot) + " at time and a half" : "",
      "About " + money(p.pay) + " before deductions" + (vac > 0 ? " (includes " + vac + "% vacation pay)" : ""),
      sh.note ? "Note: " + sh.note : "",
      "From Shiftbook",
    ]
      .filter(Boolean)
      .join("\n");
    lines.push(
      "BEGIN:VEVENT",
      "UID:" + sh.id + "@" + opts.host,
      "DTSTAMP:" + stamp(now),
      "DTSTART:" + stamp(startUtc),
      "DTEND:" + stamp(endUtc),
      fold("SUMMARY:" + escText(sh.note ? "Shift: " + sh.note : "Shift")),
      fold("DESCRIPTION:" + escText(desc)),
      "TRANSP:OPAQUE",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
