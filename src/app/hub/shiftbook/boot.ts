/* eslint-disable @typescript-eslint/no-explicit-any */
// Shiftbook UI. Ported from the original single-file app; renders into the static MARKUP
// and talks to storage through the `store` passed in, so each signed-in person has their own data.

import {
  DAY,
  DEFAULTS,
  normalize,
  ymd,
  parseYmd,
  shiftBounds as sb,
  sleepWindows as sw,
  inSleep as isl,
  periodOf as pof,
  paydayOf as pdo,
  computePay as cp,
  netEstimate as ne,
  type Shift,
  type ShiftbookState,
  type Period,
} from "@/lib/shiftbook/engine";

export type ShiftbookStore = {
  load(): Promise<{ data: ShiftbookState | null; calendarToken: string | null }>;
  /** Saves and returns the calendar token for this person's row. */
  save(state: ShiftbookState): Promise<string | null>;
  resetCalendarToken(): Promise<string>;
  changePassword(pw: string): Promise<void>;
};

export type BootOptions = {
  root: HTMLElement;
  store: ShiftbookStore;
  userId: string;
  email: string;
  origin: string;
};

export function bootShiftbook(opts: BootOptions): () => void {
  const { root, store, userId, email, origin } = opts;
  const $ = (id: string) => root.querySelector("#" + id) as any;
  const cleanups: (() => void)[] = [];
  let disposed = false;

  /* ---------- state ---------- */
  let state: ShiftbookState = normalize(null);
  let saving = false,
    saveAgain = false,
    dirty = false;
  let showPast = false;
  let editingId: string | null = null;
  let tplDraft: any[] = [];
  let calendarToken: string | null = null;

  const LS_KEY = "shiftbook.v2." + userId;
  function lsGet() {
    try {
      const r = localStorage.getItem(LS_KEY);
      return r ? JSON.parse(r) : null;
    } catch {
      return null;
    }
  }
  function lsSet(v: unknown) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(v));
    } catch {}
  }

  async function persist() {
    if (!state.settings.tz) {
      try {
        state.settings.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch {}
    }
    lsSet(state);
    dirty = true;
    if (saving) {
      saveAgain = true;
      return;
    }
    saving = true;
    setSync("saving");
    try {
      const tok = await store.save(JSON.parse(JSON.stringify(state)));
      if (tok) calendarToken = tok;
      dirty = false;
      setSync("saved");
    } catch {
      setSync("offline");
    } finally {
      saving = false;
      if (saveAgain) {
        saveAgain = false;
        persist();
      }
    }
  }
  function setSync(k: string) {
    const el = $("syncStatus");
    if (!el) return;
    el.textContent =
      k === "saving" ? "saving" : k === "offline" ? "not saved yet, check your connection" : k === "loading" ? "loading" : "";
  }

  /* ---------- engine wrappers (settings come from current state) ---------- */
  const S = () => state.settings;
  const shiftBounds = sb;
  const sleepWindows = (a: Date, b: Date) => sw(a, b, S());
  const inSleep = (t: Date) => isl(t, S());
  const periodOf = (d: Date) => pof(d, S());
  const paydayOf = (p: Period) => pdo(p, S());
  const computePay = (shifts: any[], cutoff: Date | number) => cp(shifts, S(), cutoff);
  const netEstimate = (g: number) => ne(g, S());

  /* ---------- formatting ---------- */
  const pad = (n: number) => String(n).padStart(2, "0");
  function fmtMoney(v: number) {
    const s = (Math.round(v * 100) / 100).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return "$" + s;
  }
  function fmtHours(h: number) {
    const r = Math.round(h * 100) / 100;
    return (Number.isInteger(r) ? r : r.toFixed((r * 10) % 1 === 0 ? 1 : 2)) + " h";
  }
  function fmtDur(ms: number) {
    const m = Math.floor(ms / 60000);
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return h > 0 ? h + "h " + pad(mm) + "m" : mm + "m";
  }
  function fmtTime(d: Date) {
    let h = d.getHours();
    const m = d.getMinutes();
    const ap = h >= 12 ? "pm" : "am";
    h = h % 12;
    if (h === 0) h = 12;
    return m === 0 ? h + ap : h + ":" + pad(m) + ap;
  }
  const DOWS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DOWL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const fmtDate = (d: Date) => MONS[d.getMonth()] + " " + d.getDate();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  function relDay(d: Date, now: Date) {
    const a = parseYmd(ymd(d)),
      b = parseYmd(ymd(now));
    const diff = Math.round((+a - +b) / DAY);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return DOWL[d.getDay()];
  }
  function periodLabel(p: Period) {
    const endIn = new Date(p.end.getTime() - DAY);
    return fmtDate(p.start) + " to " + fmtDate(endIn);
  }
  const esc = (s: unknown) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

  /* ---------- rendering ---------- */
  function currentLive(now: Date) {
    for (const sh of state.shifts) {
      if (sh.skip) continue;
      const { start, end } = shiftBounds(sh);
      if (start <= now && now < end) return sh;
    }
    return null;
  }
  function nextShift(now: Date) {
    let best: Shift | null = null,
      bs: Date | null = null;
    for (const sh of state.shifts) {
      if (sh.skip) continue;
      const { start } = shiftBounds(sh);
      if (start > now && (!best || start < bs!)) {
        best = sh;
        bs = start;
      }
    }
    return best;
  }

  function renderHero(now: Date) {
    const el = $("hero");
    if (!state.shifts.length) {
      el.className = "hero empty";
      el.innerHTML =
        "<h2>Nothing on the books yet</h2><p>Set your hourly rate and pay period in settings first, then add your standing week to lay in your usual shifts, or add one shift at a time.</p>" +
        '<div class="actions"><button class="btn accent" data-act="settings">Set my rate</button><button class="btn" data-act="week">Add standing week</button></div>';
      el.querySelector('[data-act="week"]').onclick = addStandingWeek;
      el.querySelector('[data-act="settings"]').onclick = openSettings;
      return;
    }
    const live = currentLive(now);
    const all = computePay(state.shifts, Infinity);
    if (live) {
      const { start, end } = shiftBounds(live);
      const sofar = computePay(state.shifts, now)[live.id];
      const full = all[live.id];
      const pct = Math.min(100, Math.max(0, ((+now - +start) / (+end - +start)) * 100));
      const total = (+end - +start) / 3600000;
      let ticks = "";
      for (const w of sleepWindows(start, end)) {
        ticks +=
          '<span class="sleep" style="left:' +
          ((+w.start - +start) / (+end - +start)) * 100 +
          "%;width:" +
          ((+w.end - +w.start) / (+end - +start)) * 100 +
          '%"></span>';
      }
      for (let h = 1; h < total; h++) ticks += '<span class="tick" style="left:' + (h / total) * 100 + '%"></span>';
      const asleep = inSleep(now);
      let until: Date | null = null;
      for (const w of sleepWindows(start, end)) if (w.start <= now && now < w.end) until = w.end;
      const [d, c] = fmtMoney(sofar.pay).split(".");
      el.className = "hero";
      el.innerHTML =
        '<p class="lead">' +
        (asleep ? "On shift, unpaid sleep time until " + fmtTime(until!) + ". Earned so far" : "On shift now, earned so far") +
        "</p>" +
        '<div class="big num">' + esc(d) + "<small>." + esc(c) + "</small></div>" +
        '<p class="sub"><b>' + fmtDur(+now - +start) + "</b> in, <b>" + fmtDur(+end - +now) + "</b> to go. This shift pays <b>" +
        fmtMoney(full.pay) + "</b> for " + fmtHours(full.hours) + " paid" +
        (full.onsite - full.hours > 0.01 ? " of " + fmtHours(full.onsite) + " on site" : "") + ".</p>" +
        '<div class="rail"><div class="track"><div class="ticks">' + ticks + '</div><div class="fill" style="width:' + pct +
        '%"></div><div class="marker" style="left:' + pct + '%"></div></div>' +
        '<div class="ends"><span><b>' + fmtTime(start) + "</b> " + DOWS[start.getDay()] + "</span><span>" + DOWS[end.getDay()] +
        " <b>" + fmtTime(end) + "</b></span></div></div>";
      return;
    }
    const nx = nextShift(now);
    el.className = "hero";
    if (nx) {
      const { start, end } = shiftBounds(nx);
      const full = all[nx.id];
      const [d, c] = fmtMoney(full.pay).split(".");
      el.innerHTML =
        '<p class="lead">Next shift, ' + esc(relDay(start, now)) + " " + fmtTime(start) + " to " + fmtTime(end) + "</p>" +
        '<div class="big num">' + esc(d) + "<small>." + esc(c) + "</small></div>" +
        '<p class="sub">Starts in <b>' + fmtDur(+start - +now) + "</b>. " + fmtHours(full.hours) + " paid" +
        (full.onsite - full.hours > 0.01 ? " of " + fmtHours(full.onsite) + " on site" : "") +
        (full.ot > 0 ? " including " + fmtHours(full.ot) + " at time and a half" : "") +
        (nx.note ? ". " + esc(nx.note) : "") + "</p>";
    } else {
      el.innerHTML =
        '<p class="lead">No upcoming shifts</p><div class="big num" style="font-size:30px">All caught up</div><p class="sub">Add the next week when the schedule comes through.</p>';
    }
  }

  function renderPeriod(now: Date) {
    const el = $("period");
    const p = periodOf(now);
    const inP = state.shifts.filter((sh) => {
      const { start } = shiftBounds(sh);
      return start >= p.start && start < p.end;
    });
    const earnedMap = computePay(inP, now);
    const projMap = computePay(inP, Infinity);
    let earned = 0, eh = 0, proj = 0, ph = 0, ot = 0;
    for (const sh of inP) {
      earned += earnedMap[sh.id].pay;
      eh += earnedMap[sh.id].hours;
      proj += projMap[sh.id].pay;
      ph += projMap[sh.id].hours;
      ot += projMap[sh.id].ot;
    }
    const st = S();
    const payday = paydayOf(p);
    const pct = proj > 0 ? (earned / proj) * 100 : 0;
    const worked = inP.filter((sh) => !sh.skip && shiftBounds(sh).end <= now).length;
    const left = inP.filter((sh) => !sh.skip && shiftBounds(sh).end > now).length;

    let cells =
      '<div class="cell"><div class="v num">' + fmtMoney(earned) + '</div><div class="k">Earned so far, ' + fmtHours(eh) + " paid</div></div>" +
      '<div class="cell"><div class="v num">' + fmtMoney(proj) + '</div><div class="k">Projected gross, ' + fmtHours(ph) + " paid" +
      (ot > 0 ? " (" + fmtHours(ot) + " OT)" : "") + "</div></div>";
    let netNote = "";
    if (st.net) {
      const n = netEstimate(proj);
      cells +=
        '<div class="cell net"><div class="v num">' + fmtMoney(n.net) + '</div><div class="k">Estimated take-home</div></div>' +
        '<div class="cell"><div class="v num">' + fmtDate(payday) + '</div><div class="k">Payday, ' + DOWL[payday.getDay()] + "</div></div>";
      netNote =
        '<p class="note">Deductions on the projected cheque: CPP ' + fmtMoney(n.cpp) + ", EI " + fmtMoney(n.ei) + ", income tax " +
        fmtMoney(n.tax) + ". Estimates only.</p>";
    } else {
      cells += '<div class="cell"><div class="v num">' + fmtDate(payday) + '</div><div class="k">Payday, ' + DOWL[payday.getDay()] + "</div></div>";
    }
    const futureMap = new Map<string, { p: Period; items: Shift[] }>();
    for (const sh of state.shifts) {
      const b = shiftBounds(sh);
      if (b.start < p.end) continue;
      const fp = periodOf(b.start);
      if (!futureMap.has(fp.key)) futureMap.set(fp.key, { p: fp, items: [] });
      futureMap.get(fp.key)!.items.push(sh);
    }
    let upcoming = "";
    const fkeys = Array.from(futureMap.keys()).sort().slice(0, 3);
    if (fkeys.length) {
      upcoming = '<div class="divider" style="margin:16px 0 10px"></div><div class="upc">';
      for (const k of fkeys) {
        const g = futureMap.get(k)!;
        const pm = computePay(g.items, Infinity);
        let gross = 0, hrs = 0;
        for (const sh of g.items) {
          gross += pm[sh.id].pay;
          hrs += pm[sh.id].hours;
        }
        const n = st.net ? netEstimate(gross) : null;
        upcoming +=
          '<div class="upcrow"><div><div class="ut">' + periodLabel(g.p) + '</div><div class="um">' + g.items.length + " shift" +
          (g.items.length === 1 ? "" : "s") + ", " + fmtHours(hrs) + ", paid " + fmtDate(paydayOf(g.p)) + "</div></div>" +
          '<div class="uv"><div class="num">' + fmtMoney(gross) + "</div>" + (n ? '<div class="um num">about ' + fmtMoney(n.net) + " net</div>" : "") +
          "</div></div>";
      }
      upcoming += "</div>";
    }
    let warn = "";
    if (!(Number(st.rate) > 0))
      warn = '<p class="note" style="color:var(--accent-ink)">Your hourly rate is 0, so every shift comes out at $0.00. Set it in settings.</p>';
    else if (!inP.length && fkeys.length)
      warn = '<p class="note">Nothing lands in this period. Your shifts fall in the periods below; if that looks wrong, check the period start date in settings.</p>';

    el.innerHTML =
      '<div class="head"><h2>This pay period</h2><span class="dates">' + periodLabel(p) + "</span></div>" +
      '<div class="grid">' + cells + "</div>" +
      '<div class="bar"><div class="sched" style="width:100%"></div><div class="earned" style="width:' + pct + '%"></div></div>' +
      '<div class="foot"><span><b>' + worked + "</b> shift" + (worked === 1 ? "" : "s") + " done</span><span><b>" + left +
      "</b> to go</span><span>at <b>" + fmtMoney(Number(st.rate) || 0) + "</b>/h" +
      ((Number(st.vacPct) || 0) > 0 ? " + " + Number(st.vacPct) + "% vacation pay" : "") + "</span></div>" +
      warn + netNote + upcoming;
  }

  /* monthly view */
  let monthOffset = 0;
  function periodTotals(p: Period) {
    const items = state.shifts.filter((sh) => {
      const { start } = shiftBounds(sh);
      return start >= p.start && start < p.end;
    });
    const m = computePay(items, Infinity);
    let gross = 0, hrs = 0;
    for (const sh of items) {
      gross += m[sh.id].pay;
      hrs += m[sh.id].hours;
    }
    return { items, map: m, gross, hrs };
  }
  function renderMonth(now: Date) {
    const el = $("month");
    const st = S();
    const ms = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const me = new Date(ms.getFullYear(), ms.getMonth() + 1, 1);
    const name = MONL[ms.getMonth()] + (ms.getFullYear() !== now.getFullYear() ? " " + ms.getFullYear() : "");
    const cache = new Map<string, ReturnType<typeof periodTotals>>();
    let gross = 0, hrs = 0, onsite = 0, earned = 0, net = 0, count = 0;
    const payNow = computePay(state.shifts, now);
    for (const sh of state.shifts) {
      const { start } = shiftBounds(sh);
      if (start < ms || start >= me) continue;
      const p = periodOf(start);
      if (!cache.has(p.key)) cache.set(p.key, periodTotals(p));
      const pt = cache.get(p.key)!;
      const r = pt.map[sh.id];
      gross += r.pay;
      hrs += r.hours;
      onsite += r.onsite;
      if (!sh.skip) count++;
      earned += Math.min(r.pay, payNow[sh.id] ? payNow[sh.id].pay : 0);
      if (st.net && pt.gross > 0) net += r.pay * (netEstimate(pt.gross).net / pt.gross);
    }
    const cheques: { p: Period; pd: Date; t: ReturnType<typeof periodTotals> }[] = [];
    const seen = new Set<string>();
    for (let d = new Date(ms.getTime() - 45 * DAY); d < me; d = new Date(d.getTime() + DAY)) {
      const p = periodOf(d);
      if (seen.has(p.key)) continue;
      seen.add(p.key);
      const pd = paydayOf(p);
      if (pd >= ms && pd < me) {
        const t = periodTotals(p);
        if (t.items.length) cheques.push({ p, pd, t });
      }
    }
    let cells =
      '<div class="cell"><div class="v num">' + fmtMoney(gross) + '</div><div class="k">Gross for shifts worked, ' + fmtHours(hrs) + " paid</div></div>" +
      '<div class="cell"><div class="v num">' + fmtMoney(earned) + '</div><div class="k">Earned so far</div></div>';
    if (st.net) cells += '<div class="cell net"><div class="v num">' + fmtMoney(net) + '</div><div class="k">Estimated take-home</div></div>';
    cells += '<div class="cell"><div class="v num">' + count + '</div><div class="k">Shift' + (count === 1 ? "" : "s") + ", " + fmtHours(onsite) + " on site</div></div>";
    let cq = '<div class="cheques">';
    if (cheques.length) {
      let tg = 0, tn = 0;
      for (const c of cheques) {
        const n = st.net ? netEstimate(c.t.gross).net : null;
        tg += c.t.gross;
        if (n != null) tn += n;
        cq +=
          '<div class="cq"><div><div>Cheque on ' + fmtDate(c.pd) + '</div><div class="um">For ' + periodLabel(c.p) +
          '</div></div><div style="text-align:right"><div class="num">' + fmtMoney(c.t.gross) + "</div>" +
          (n != null ? '<div class="um num">about ' + fmtMoney(n) + " net</div>" : "") + "</div></div>";
      }
      cq +=
        '<div class="cq" style="font-weight:600;border-top:1px solid var(--line);margin-top:4px;padding-top:8px"><div>Paid out in ' +
        MONL[ms.getMonth()] + '</div><div class="num">' + fmtMoney(tg) + (st.net ? ' <span class="um">(about ' + fmtMoney(tn) + " net)</span>" : "") +
        "</div></div>";
    } else {
      cq += '<div class="cq um">No cheques with logged shifts land in ' + MONL[ms.getMonth()] + ".</div>";
    }
    cq += "</div>";
    el.innerHTML =
      '<div class="head"><h2>' + esc(name) +
      '</h2><div class="nav"><button id="mPrev" aria-label="Previous month">&lsaquo;</button><button id="mNext" aria-label="Next month">&rsaquo;</button></div></div>' +
      '<div class="grid">' + cells + "</div>" + cq;
    $("mPrev").onclick = () => {
      monthOffset--;
      renderMonth(new Date());
    };
    $("mNext").onclick = () => {
      monthOffset++;
      renderMonth(new Date());
    };
  }

  function renderShifts(now: Date) {
    const groups = $("groups");
    const cur = periodOf(now);
    const payAll = computePay(state.shifts, Infinity);
    const payNow = computePay(state.shifts, now);
    const sorted = state.shifts.slice().sort((a, b) => +shiftBounds(a).start - +shiftBounds(b).start);
    const byPeriod = new Map<string, { p: Period; items: Shift[] }>();
    for (const sh of sorted) {
      const p = periodOf(shiftBounds(sh).start);
      if (!byPeriod.has(p.key)) byPeriod.set(p.key, { p, items: [] });
      byPeriod.get(p.key)!.items.push(sh);
    }
    if (!byPeriod.has(cur.key)) byPeriod.set(cur.key, { p: cur, items: [] });
    const keys = Array.from(byPeriod.keys()).sort();
    let html = "";
    let pastCount = 0;
    for (const k of keys) {
      const g = byPeriod.get(k)!;
      const isPast = g.p.end <= parseYmd(ymd(now));
      if (isPast) {
        pastCount++;
        if (!showPast) continue;
      }
      let tot = 0;
      for (const sh of g.items) tot += payAll[sh.id].pay;
      const title = k === cur.key ? "This period" : (g.p.start > now ? "Next, " : "Earlier, ") + periodLabel(g.p);
      html += '<div class="group"><div class="gtitle"><span>' + esc(title) + '</span><b class="num">' + fmtMoney(tot) + '</b></div><div class="list">';
      if (!g.items.length) html += '<div class="emptyrow">No shifts in this period yet.</div>';
      for (const sh of g.items) {
        const { start, end } = shiftBounds(sh);
        const full = payAll[sh.id];
        let cls = "", st = "";
        if (sh.skip) {
          cls = "skip";
          st = "not worked";
        } else if (end <= now) {
          cls = "past";
          st = "done";
        } else if (start <= now) {
          cls = "live";
          st = "on now, " + fmtMoney(payNow[sh.id].pay) + " so far";
        } else st = "upcoming";
        html +=
          '<button class="row ' + cls + '" data-id="' + esc(sh.id) + '">' +
          '<div class="day"><span class="dow">' + DOWS[start.getDay()] + '</span><span class="dd num">' + start.getDate() + "</span></div>" +
          '<div class="mid"><div class="t">' + fmtTime(start) + " to " + fmtTime(end) + (sameDay(start, end) ? "" : " (" + DOWS[end.getDay()] + ")") + "</div>" +
          '<div class="m">' + fmtHours(full.hours) + " paid" + (full.onsite - full.hours > 0.01 ? " of " + fmtHours(full.onsite) : "") +
          (full.ot > 0 ? ", " + fmtHours(full.ot) + " OT" : "") +
          (sh.rate != null && (sh.rate as unknown) !== "" ? ", $" + Number(sh.rate).toFixed(2) + "/h" : "") +
          (sh.note ? ", " + esc(sh.note) : "") + "</div></div>" +
          '<div class="pay"><div class="amt num">' + fmtMoney(full.pay) + '</div><div class="st">' + st + "</div></div></button>";
      }
      html += "</div></div>";
    }
    groups.innerHTML = html;
    groups.querySelectorAll(".row").forEach((b: any) => (b.onclick = () => openShift(b.dataset.id)));
    const tp = $("togglePast");
    if (pastCount) {
      tp.style.display = "";
      tp.textContent = showPast ? "Hide past periods" : "Show " + pastCount + " past period" + (pastCount === 1 ? "" : "s");
    } else tp.style.display = "none";
    $("shiftCount").textContent = state.shifts.length ? state.shifts.length + " on the books" : "";
  }

  function renderAll() {
    const now = new Date();
    applyTheme();
    renderHero(now);
    renderPeriod(now);
    renderMonth(now);
    renderShifts(now);
  }
  let lastMinute = -1;
  function tick() {
    const now = new Date();
    const live = currentLive(now);
    if (live) {
      renderHero(now);
      renderPeriod(now);
      renderMonth(now);
    }
    const m = now.getMinutes();
    if (m !== lastMinute) {
      lastMinute = m;
      if (!live) renderHero(now);
      renderShifts(now);
    }
  }
  function applyTheme() {
    const t = S().theme || "auto";
    if (t === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", t);
  }

  /* ---------- sheets ---------- */
  const scrim = $("scrim");
  const shiftSheet = $("shiftSheet");
  const settingsSheet = $("settingsSheet");
  const accountSheet = $("accountSheet");
  let openSheet: any = null;
  function show(sheet: any) {
    openSheet = sheet;
    scrim.classList.add("on");
    sheet.classList.add("on");
    const f = sheet.querySelector("input:not([readonly]):not([hidden]),select,button");
    if (f) setTimeout(() => f.focus(), 200);
  }
  function hide() {
    if (!openSheet) return;
    scrim.classList.remove("on");
    openSheet.classList.remove("on");
    openSheet = null;
  }
  scrim.onclick = hide;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") hide();
  };
  document.addEventListener("keydown", onKey);
  cleanups.push(() => document.removeEventListener("keydown", onKey));

  const setSwitch = (id: string, on: boolean) => $(id).setAttribute("aria-checked", on ? "true" : "false");
  const getSwitch = (id: string) => $(id).getAttribute("aria-checked") === "true";
  root.querySelectorAll(".switch").forEach((b: any) => (b.onclick = () => b.setAttribute("aria-checked", b.getAttribute("aria-checked") === "true" ? "false" : "true")));

  const fDate = $("fDate"), fStart = $("fStart"), fEnd = $("fEnd"), fRate = $("fRate"), fNote = $("fNote");
  function updatePreview() {
    const pv = $("shiftPreview");
    if (!fDate.value || !fStart.value || !fEnd.value) {
      pv.textContent = "Pick a date and times to see the hours and pay.";
      return;
    }
    const tmp: any = { date: fDate.value, start: fStart.value, end: fEnd.value, rate: fRate.value === "" ? null : fRate.value, skip: getSwitch("fSkip"), id: "__preview" };
    const others = state.shifts.filter((s) => s.id !== editingId);
    const pay = computePay(others.concat([tmp]), Infinity)[tmp.id];
    const { start, end } = shiftBounds(tmp);
    pv.innerHTML =
      "<b>" + fmtHours(pay.hours) + " paid</b>" + (pay.onsite - pay.hours > 0.01 ? " of " + fmtHours(pay.onsite) + " on site" : "") +
      (sameDay(start, end) ? "" : ", ends " + DOWS[end.getDay()]) + (pay.ot > 0 ? ", " + fmtHours(pay.ot) + " at time and a half" : "") +
      ", <b>" + fmtMoney(pay.pay) + "</b>";
  }
  [fDate, fStart, fEnd, fRate].forEach((i: any) => i.addEventListener("input", updatePreview));
  $("fSkip").addEventListener("click", updatePreview);

  function openShift(id: string | null) {
    editingId = id || null;
    const sh = id ? state.shifts.find((s) => s.id === id) : null;
    $("shiftTitle").textContent = sh ? "Edit shift" : "Add a shift";
    $("fDelete").style.visibility = sh ? "visible" : "hidden";
    const now = new Date();
    const firstTpl = (S().templates || [])[0];
    fDate.value = sh ? sh.date : ymd(now);
    fStart.value = sh ? sh.start : firstTpl ? firstTpl.start : "09:00";
    fEnd.value = sh ? sh.end : firstTpl ? firstTpl.end : "17:00";
    fRate.value = sh && sh.rate != null ? sh.rate : "";
    fNote.value = sh ? sh.note || "" : "";
    setSwitch("fSkip", !!(sh && sh.skip));
    updatePreview();
    show(shiftSheet);
  }
  $("fCancel").onclick = hide;
  $("fSave").onclick = () => {
    if (!fDate.value || !fStart.value || !fEnd.value) {
      toast("Date, start and end are needed.");
      return;
    }
    const rec: Shift = {
      id: editingId || uid(),
      date: fDate.value,
      start: fStart.value,
      end: fEnd.value,
      rate: fRate.value === "" ? null : Number(fRate.value),
      note: fNote.value.trim(),
      skip: getSwitch("fSkip"),
    };
    const wasEditing = !!editingId;
    if (editingId) {
      const i = state.shifts.findIndex((s) => s.id === editingId);
      if (i >= 0) state.shifts[i] = rec;
      else state.shifts.push(rec);
    } else state.shifts.push(rec);
    hide();
    renderAll();
    persist();
    toast(wasEditing ? "Shift updated" : "Shift added");
  };
  $("fDelete").onclick = () => {
    if (!editingId) return;
    state.shifts = state.shifts.filter((s) => s.id !== editingId);
    hide();
    renderAll();
    persist();
    toast("Shift deleted");
  };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* settings */
  function renderTpl() {
    const box = $("tplList");
    box.innerHTML =
      tplDraft
        .map(
          (t, i) =>
            '<div class="tpl"><select data-i="' + i + '" data-k="dow">' +
            DOWL.map((d, j) => '<option value="' + j + '"' + (Number(t.dow) === j ? " selected" : "") + ">" + d + "</option>").join("") +
            "</select>" +
            '<input type="time" step="900" data-i="' + i + '" data-k="start" value="' + esc(t.start) + '">' +
            '<input type="time" step="900" data-i="' + i + '" data-k="end" value="' + esc(t.end) + '">' +
            '<button class="x" data-i="' + i + '" aria-label="Remove">×</button></div>'
        )
        .join("") || '<p class="note">No standing shifts. Add one below.</p>';
    box.querySelectorAll("select,input").forEach(
      (el: any) => (el.onchange = () => (tplDraft[el.dataset.i][el.dataset.k] = el.dataset.k === "dow" ? Number(el.value) : el.value))
    );
    box.querySelectorAll("button.x").forEach(
      (b: any) =>
        (b.onclick = () => {
          tplDraft.splice(Number(b.dataset.i), 1);
          renderTpl();
        })
    );
  }
  $("tplAdd").onclick = () => {
    tplDraft.push({ dow: 0, start: "09:00", end: "17:00" });
    renderTpl();
  };

  function openSettings() {
    const s = S();
    $("sRate").value = s.rate;
    $("sVac").value = s.vacPct == null ? 4 : s.vacPct;
    $("sLen").value = String(s.periodLen);
    $("sAnchor").value = s.anchor;
    $("sPayDow").value = String(s.paydayDow == null ? 5 : s.paydayDow);
    $("sPayLag").value = String(s.paydayLag || 0);
    updatePayPreview();
    setSwitch("sSleep", !!s.sleepOn);
    $("sSleepStart").value = s.sleepStart || "02:00";
    $("sSleepEnd").value = s.sleepEnd || "08:00";
    setSwitch("sOtWeek", !!s.otWeek);
    setSwitch("sOtDay", !!s.otDay);
    setSwitch("sNet", s.net !== false);
    $("sCpp").value = s.cpp;
    $("sEi").value = s.ei;
    $("sTax").value = s.taxOverride == null ? "" : s.taxOverride;
    $("sTheme").value = s.theme || "auto";
    tplDraft = (s.templates || []).map((t) => Object.assign({}, t));
    renderTpl();
    show(settingsSheet);
  }
  function updatePayPreview() {
    const tmp = Object.assign({}, S(), {
      periodLen: Number($("sLen").value) || 14,
      anchor: $("sAnchor").value || DEFAULTS.anchor,
      paydayDow: Number($("sPayDow").value),
      paydayLag: Number($("sPayLag").value) || 0,
    });
    const p = pof(new Date(), tmp);
    const pd = pdo(p, tmp);
    $("payPreview").textContent = "This period runs " + periodLabel(p) + " and pays on " + DOWL[pd.getDay()] + " " + fmtDate(pd) + ".";
  }
  ["sLen", "sAnchor", "sPayDow", "sPayLag"].forEach((id) => $(id).addEventListener("change", updatePayPreview));
  $("openSettings").onclick = openSettings;
  $("sCancel").onclick = hide;
  $("sSave").onclick = () => {
    const s = S();
    s.rate = Number($("sRate").value) || 0;
    s.vacPct = Number($("sVac").value) || 0;
    s.periodLen = Number($("sLen").value) || 14;
    s.anchor = $("sAnchor").value || DEFAULTS.anchor;
    s.paydayDow = Number($("sPayDow").value);
    s.paydayLag = Number($("sPayLag").value) || 0;
    s.sleepOn = getSwitch("sSleep");
    s.sleepStart = $("sSleepStart").value || "02:00";
    s.sleepEnd = $("sSleepEnd").value || "08:00";
    s.otWeek = getSwitch("sOtWeek");
    s.otDay = getSwitch("sOtDay");
    s.net = getSwitch("sNet");
    s.cpp = Number($("sCpp").value) || 0;
    s.ei = Number($("sEi").value) || 0;
    const tx = $("sTax").value;
    s.taxOverride = tx === "" ? null : Number(tx);
    s.theme = $("sTheme").value;
    s.templates = tplDraft.filter((t) => t.start && t.end).map((t) => ({ dow: Number(t.dow), start: t.start, end: t.end }));
    hide();
    renderAll();
    persist();
    toast("Settings saved");
  };

  /* standing week */
  function addStandingWeek() {
    const tpls = S().templates || [];
    if (!tpls.length) {
      toast("Add standing shifts in settings first.");
      openSettings();
      return;
    }
    const now = new Date();
    const today = parseYmd(ymd(now));
    const have = new Set(state.shifts.map((s) => s.date));
    let added = 0;
    let from: Date | null = null,
      to: Date | null = null;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getTime() + i * DAY);
      for (const t of tpls) {
        if (Number(t.dow) !== d.getDay()) continue;
        const key = ymd(d);
        if (have.has(key)) continue;
        const b = shiftBounds({ date: key, start: t.start, end: t.end });
        if (b.end <= now) continue;
        state.shifts.push({ id: uid(), date: key, start: t.start, end: t.end, rate: null, note: "", skip: false });
        have.add(key);
        added++;
        if (!from) from = d;
        to = d;
      }
    }
    renderAll();
    persist();
    toast(
      added
        ? "Added " + added + " shift" + (added === 1 ? "" : "s") + " for " + fmtDate(from!) + (added > 1 ? " to " + fmtDate(to!) : "")
        : "This week's standing shifts are already on the books."
    );
  }
  $("addWeek").onclick = addStandingWeek;
  $("addShift").onclick = () => openShift(null);
  $("togglePast").onclick = () => {
    showPast = !showPast;
    renderShifts(new Date());
  };

  /* ---------- calendar and account ---------- */
  function feedUrl() {
    return calendarToken ? origin + "/api/shiftbook/calendar/" + calendarToken + ".ics" : "";
  }
  function renderAccount() {
    const url = feedUrl();
    $("calUrl").value = url || "Not ready yet, try again in a moment";
    const webcal = url.replace(/^https?:/, "webcal:");
    $("calGoogle").href = url ? "https://calendar.google.com/calendar/r?cid=" + encodeURIComponent(webcal) : "#";
    $("calApple").href = url ? webcal : "#";
    $("accEmail").textContent = email;
  }
  $("openAccount").onclick = () => {
    renderAccount();
    show(accountSheet);
  };
  $("accClose").onclick = hide;
  $("calCopy").onclick = async () => {
    const url = feedUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast("Calendar link copied");
    } catch {
      $("calUrl").select();
      toast("Select the link and copy it");
    }
  };
  $("calReset").onclick = async () => {
    if (!confirm("Make a new calendar link? Calendars using the old link will stop updating until you subscribe again.")) return;
    try {
      calendarToken = await store.resetCalendarToken();
      renderAccount();
      toast("New link ready. Subscribe again with it.");
    } catch {
      toast("Couldn't make a new link. Try again.");
    }
  };
  $("dataExport").onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "shiftbook-backup-" + ymd(new Date()) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $("dataImport").onchange = async (e: any) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = normalize(JSON.parse(await file.text()));
      if (!confirm("Replace everything here with " + parsed.shifts.length + " shifts and the settings from this file?")) return;
      const tz = state.settings.tz;
      state = parsed;
      if (!state.settings.tz && tz) state.settings.tz = tz;
      hide();
      renderAll();
      persist();
      toast("Imported " + state.shifts.length + " shifts");
    } catch {
      toast("That file isn't a Shiftbook backup.");
    }
  };
  $("pwSave").onclick = async () => {
    const pw = $("newPw").value;
    if (!pw || pw.length < 8) {
      toast("Use at least 8 characters.");
      return;
    }
    try {
      await store.changePassword(pw);
      $("newPw").value = "";
      toast("Password changed");
    } catch (err: any) {
      toast(err?.message || "Couldn't change the password.");
    }
  };

  let toastT: any;
  function toast(msg: string) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("on"), 2600);
  }

  /* ---------- boot ---------- */
  const cached = lsGet();
  if (cached) state = normalize(cached);
  renderAll();
  const iv = setInterval(tick, 1000);
  cleanups.push(() => clearInterval(iv));

  async function pull(first: boolean) {
    if (first && !cached) setSync("loading");
    try {
      const res = await store.load();
      if (disposed) return;
      calendarToken = res.calendarToken;
      if (saving) return; // local edits win; they're on their way up
      if (dirty) {
        persist(); // an earlier save failed; retry it instead of pulling over it
        return;
      }
      if (res.data) {
        const incoming = normalize(res.data);
        if (JSON.stringify(incoming) !== JSON.stringify(state)) {
          state = incoming;
          lsSet(state);
          if (!openSheet) renderAll();
        }
      } else if (first) {
        persist(); // first visit: create this person's row
      }
      setSync("saved");
    } catch {
      if (!disposed) setSync("offline");
    }
  }
  pull(true);
  const onVis = () => {
    if (document.visibilityState === "visible") pull(false);
  };
  document.addEventListener("visibilitychange", onVis);
  cleanups.push(() => document.removeEventListener("visibilitychange", onVis));

  return () => {
    disposed = true;
    clearTimeout(toastT);
    cleanups.forEach((f) => f());
  };
}
