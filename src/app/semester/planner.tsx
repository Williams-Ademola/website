"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  COURSES, COURSE_NAME, NEXT, NOTES, POINTS, RESOURCES, TAG_LABEL, TARGETS,
  WEEKS, WINTER, type CourseKey, type Tag, type Task, type Week,
} from "./data";

type Scores = Record<CourseKey, Record<string, number>>;
interface SavedState {
  done: Record<string, boolean>;
  scores: Scores;
}

const STORAGE_KEY = "semester-fall-2026";
const SYNC_KEY = "semester-sync-key";
const PLUS_KEY = "semester-show-plus";
const EMPTY: SavedState = { done: {}, scores: { stat: {}, phys: {}, hist: {} } };
const TABS = [
  { key: "1", id: "week", label: "this week" },
  { key: "2", id: "term", label: "term" },
  { key: "3", id: "grades", label: "grades" },
  { key: "4", id: "notes", label: "notes" },
] as const;
type TabId = (typeof TABS)[number]["id"];
type SyncStatus = "off" | "loading" | "synced" | "saving" | "error" | "wrong key";

const day = (s: string) => new Date(`${s}T12:00:00`);
const fmt = (s: string) =>
  day(s).toLocaleDateString("en-CA", { month: "short", day: "numeric" }).toLowerCase();
const taskId = (w: Week, i: number) => `w${w.n}-${i}`;

function normalize(x: Partial<SavedState> | null | undefined): SavedState {
  return {
    done: x?.done ?? {},
    scores: { ...EMPTY.scores, ...(x?.scores ?? {}) },
  };
}

function readLocal(): SavedState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeLocal(s: SavedState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

async function pull(key: string): Promise<SavedState | null | "unauthorized"> {
  const res = await fetch("/api/semester", { headers: { "x-semester-key": key }, cache: "no-store" });
  if (res.status === 401) return "unauthorized";
  if (!res.ok) throw new Error("pull failed");
  const { state } = (await res.json()) as { state: Partial<SavedState> | null };
  return state ? normalize(state) : null;
}

async function push(key: string, s: SavedState) {
  const res = await fetch("/api/semester", {
    method: "PUT",
    headers: { "x-semester-key": key, "Content-Type": "application/json" },
    body: JSON.stringify(s),
  });
  if (res.status === 401) return "unauthorized" as const;
  if (!res.ok) throw new Error("push failed");
  return "ok" as const;
}

function currentWeek(now: Date): Week {
  return WEEKS.find((w) => now <= new Date(`${w.end}T23:59:59`)) ?? WEEKS[WEEKS.length - 1];
}

function asciiBar(done: number, total: number, width = 16) {
  const filled = total ? Math.round((done / total) * width) : 0;
  return `[${"#".repeat(filled)}${"-".repeat(width - filled)}]`;
}

type Tally = { cd: number; ct: number; pd: number; pt: number };
const ZERO: Tally = { cd: 0, ct: 0, pd: 0, pt: 0 };
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const hours = (m: number) => (m < 60 ? `${Math.round(m)} min` : `${+(Math.round(m / 30) / 2).toFixed(1)} h`);

// minutes done and total, split into core (b+ to a) and a+ extras
function tallyWeek(w: Week, done: Record<string, boolean>, only?: Tag): Tally {
  const t = { ...ZERO };
  w.tasks.forEach(([tag, , mins, plus], i) => {
    if (only && tag !== only) return;
    const hit = !!done[taskId(w, i)];
    if (plus) { t.pt += mins; if (hit) t.pd += mins; }
    else { t.ct += mins; if (hit) t.cd += mins; }
  });
  return t;
}

function tallyTerm(done: Record<string, boolean>, only?: Tag): Tally {
  return WEEKS.reduce((acc, w) => {
    const t = tallyWeek(w, done, only);
    return { cd: acc.cd + t.cd, ct: acc.ct + t.ct, pd: acc.pd + t.pd, pt: acc.pt + t.pt };
  }, { ...ZERO });
}

// core minutes that should be done by now if the plan is followed week by week
function expectedCore(now: Date) {
  const t = now.getTime();
  return WEEKS.reduce((sum, w) => {
    const a = new Date(`${w.start}T00:00:00`).getTime();
    const b = new Date(`${w.end}T23:59:59`).getTime();
    const core = tallyWeek(w, {}).ct;
    return sum + (t >= b ? core : t > a ? (core * (t - a)) / (b - a) : 0);
  }, 0);
}

function letter(pct: number): [string, number] {
  const hit = POINTS.find(([cut]) => pct >= cut);
  return hit ? [hit[1], hit[2]] : ["f", 0];
}

function standing(key: CourseKey, scores: Scores) {
  const sc = scores[key] ?? {};
  let weighted = 0;
  let earned = 0;
  for (const [id, , w] of COURSES[key].items) {
    const v = sc[id];
    if (typeof v === "number" && !Number.isNaN(v)) {
      weighted += w;
      earned += (Math.min(Math.max(v, 0), 100) * w) / 100;
    }
  }
  return { weighted, earned, current: weighted ? (earned / weighted) * 100 : null, remaining: 100 - weighted };
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold mb-6 flex items-center text-white">
      <span className="text-accent mr-2">*</span> {children}
    </h2>
  );
}

function TagChip({ tag }: { tag: Tag }) {
  return (
    <span className={`shrink-0 text-sm ${tag === "admin" ? "text-accent" : "text-gray-600"}`}>
      [{TAG_LABEL[tag]}]
    </span>
  );
}

export default function SemesterPlanner() {
  const [now, setNow] = useState<Date | null>(null);
  const [state, setState] = useState<SavedState>(EMPTY);
  const [tab, setTab] = useState<TabId>("week");
  const [syncKey, setSyncKey] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncStatus>("off");
  const [keyInput, setKeyInput] = useState("");
  const [showPlus, setShowPlus] = useState(true);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFromServer = useCallback(async (key: string, local: SavedState | null) => {
    setSync("loading");
    try {
      const remote = await pull(key);
      if (remote === "unauthorized") {
        setSync("wrong key");
        return false;
      }
      if (remote) {
        setState(remote);
        writeLocal(remote);
      } else if (local) {
        await push(key, local);
      }
      setSync("synced");
      return true;
    } catch {
      setSync("error");
      return false;
    }
  }, []);

  useEffect(() => {
    setNow(new Date());
    try {
      setShowPlus(window.localStorage.getItem(PLUS_KEY) !== "0");
    } catch {
      /* ignore */
    }
    const local = readLocal();
    if (local) setState(local);
    let key: string | null = null;
    try {
      key = window.localStorage.getItem(SYNC_KEY);
    } catch {
      /* ignore */
    }
    if (key) {
      setSyncKey(key);
      void loadFromServer(key, local);
    }
  }, [loadFromServer]);

  useEffect(() => {
    if (!syncKey) return;
    const onFocus = () => {
      if (document.visibilityState === "visible" && !pushTimer.current) void loadFromServer(syncKey, null);
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [syncKey, loadFromServer]);

  const persist = useCallback(
    (next: SavedState) => {
      setState(next);
      writeLocal(next);
      if (!syncKey) return;
      setSync("saving");
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(async () => {
        try {
          pushTimer.current = null;
          const r = await push(syncKey, next);
          setSync(r === "unauthorized" ? "wrong key" : "synced");
        } catch {
          setSync("error");
        }
      }, 600);
    },
    [syncKey],
  );

  const connect = async () => {
    const key = keyInput.trim();
    if (!key) return;
    const ok = await loadFromServer(key, readLocal());
    if (ok) {
      try {
        window.localStorage.setItem(SYNC_KEY, key);
      } catch {
        /* ignore */
      }
      setSyncKey(key);
      setKeyInput("");
    }
  };

  const disconnect = () => {
    try {
      window.localStorage.removeItem(SYNC_KEY);
    } catch {
      /* ignore */
    }
    setSyncKey(null);
    setSync("off");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const hit = TABS.find((x) => x.key === e.key);
      if (hit) setTab(hit.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggle = (id: string) => {
    const done = { ...state.done };
    if (done[id]) delete done[id];
    else done[id] = true;
    persist({ ...state, done });
  };

  const setScore = (course: CourseKey, id: string, raw: string) => {
    const scores: Scores = { ...state.scores, [course]: { ...state.scores[course] } };
    if (raw === "") delete scores[course][id];
    else scores[course][id] = Number(raw);
    persist({ ...state, scores });
  };

  const flipPlus = () => {
    const next = !showPlus;
    setShowPlus(next);
    try {
      window.localStorage.setItem(PLUS_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const weekLine = (w: Week, width = 16) => {
    const t = tallyWeek(w, state.done);
    return (
      <>
        <span className="text-accent">{asciiBar(t.cd, t.ct, width)}</span> core {pct(t.cd, t.ct)}%
        {showPlus && t.pt > 0 && (
          <>
            {" "}
            <span className="text-gray-600">/</span> a+ {pct(t.pd, t.pt)}%
          </>
        )}
      </>
    );
  };

  const week = useMemo(() => (now ? currentWeek(now) : null), [now]);
  const upcoming = useMemo(
    () => (now ? NEXT.filter(([, t]) => new Date(t) > now).slice(0, 3) : []),
    [now],
  );

  const renderTasks = (w: Week, only?: Tag) => {
    const rows = w.tasks
      .map((t, i) => [t, i] as [Task, number])
      .filter(([[tag]]) => !only || tag === only);
    const core = rows.filter(([t]) => !t[3]);
    const plus = showPlus ? rows.filter(([t]) => t[3]) : [];
    return (
      <>
        {taskItems(w, core, only)}
        {plus.length > 0 && (
          <>
            <p className="text-xs text-accent mt-5 mb-2">a+ extras</p>
            {taskItems(w, plus, only)}
          </>
        )}
      </>
    );
  };

  const taskItems = (w: Week, rows: [Task, number][], only?: Tag) => (
    <ul className="space-y-2">
      {rows.map(([[tag, text, mins, plus], i]) => {
        const id = taskId(w, i);
        const done = !!state.done[id];
        return (
          <li key={id}>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" checked={done} onChange={() => toggle(id)} className="sr-only peer" />
              <span
                aria-hidden
                className={`shrink-0 text-sm peer-focus-visible:text-accent ${done ? "text-accent" : "text-gray-600 group-hover:text-gray-400"}`}
              >
                {done ? "[x]" : "[ ]"}
              </span>
              <span className={`text-sm leading-relaxed ${done ? "text-gray-600 line-through" : "text-gray-300"}`}>
                {!only && <TagChip tag={tag} />} {plus && <span className="text-accent">[a+]</span>} {text}
                <span className="text-gray-600 whitespace-nowrap"> ~{hours(mins)}</span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );

  const renderDue = (items: [Tag, string, string][]) =>
    items.length ? (
      <div className="border-l-2 border-l-accent/50 pl-4 space-y-1 my-6">
        {items.map(([tag, when, what]) => (
          <p key={`${when}-${what}`} className="text-sm text-gray-300 flex flex-wrap gap-x-3">
            <span className="text-gray-400 w-24 shrink-0">{when}</span>
            <TagChip tag={tag} />
            <span>{what}</span>
          </p>
        ))}
      </div>
    ) : null;

  const syncLabel: Record<SyncStatus, string> = {
    off: "saved on this device only",
    loading: "syncing…",
    synced: "synced across devices",
    saving: "saving…",
    error: "couldn't reach the server, saved on this device",
    "wrong key": "that key didn't work",
  };

  return (
    <main className="animate-fade-in-up">
      <h1 className="text-4xl font-bold mb-8 text-white">
        <span className="text-accent mr-2">*</span>fall 2026
      </h1>
      <p className="text-gray-400 mb-10 leading-relaxed">
        statistics, physics and history. my plan for the term: what to read, what&apos;s due, and what i
        need on everything left to land the grade i want. core tasks are the b+ to a plan. a+ extras are what
        push past 90. progress is weighted by how long each task takes.
      </p>

      <section className="mb-10" aria-label="term timeline">
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-[560px] text-xs">
            {WEEKS.map((w) => {
              const isNow = week?.n === w.n;
              const past = now ? now > new Date(`${w.end}T23:59:59`) : false;
              const test = w.due.some(([, , t]) => /test|midterm/.test(t));
              return (
                <div
                  key={w.n}
                  className={`flex-1 border px-1 py-2 text-center transition-colors ${
                    isNow ? "border-accent text-white" : past ? "border-gray-800 text-gray-600" : "border-gray-800 text-gray-400"
                  } ${w.brk || w.exam ? "bg-gray-800/50" : ""}`}
                  title={w.title}
                >
                  {w.exam ? "ex" : w.brk ? "br" : `w${w.n}`}
                  <div className={`mt-1 h-1 ${test ? "bg-accent" : w.due.length ? "bg-gray-600" : "bg-transparent"}`} />
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-2">red bar: test that week. grey bar: something due.</p>
        {upcoming.length > 0 && now && (
          <div className="mt-6 space-y-1 text-sm">
            {upcoming.map(([c, t, label, big]) => {
              const days = Math.ceil((new Date(t).getTime() - now.getTime()) / 86_400_000);
              return (
                <p key={label} className="text-gray-400">
                  <span className="text-gray-600">&gt;</span>{" "}
                  <span className={big ? "text-accent" : "text-white"}>{label}</span>{" "}
                  in {days <= 1 ? "under a day" : `${days} days`}
                  <span className="text-gray-600"> [{TAG_LABEL[c]}]</span>
                </p>
              );
            })}
          </div>
        )}
      </section>

      {now && <Progress done={state.done} now={now} showPlus={showPlus} onFlip={flipPlus} />}

      <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm mb-12" role="tablist" aria-label="planner sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`transition-colors duration-200 hover:text-accent ${tab === t.id ? "text-accent" : "text-gray-400"}`}
          >
            [{t.key}] {t.label}
          </button>
        ))}
      </nav>

      {!now || !week ? (
        <p className="text-sm text-gray-600">loading…</p>
      ) : tab === "week" ? (
        <section className="animate-fade-in-up">
          <Heading>
            {week.exam ? "exams" : `week ${week.n}`}: {week.title}
          </Heading>
          <p className="text-sm text-gray-400 mb-2">
            {fmt(week.start)} to {fmt(week.end)}
            {week.note ? `. ${week.note}` : ""}
          </p>
          <p className="text-sm text-gray-400">{weekLine(week)}</p>
          <p className="text-xs text-gray-600 mt-1">
            about {hours(tallyWeek(week, {}).ct)} of core work
            {showPlus && tallyWeek(week, {}).pt > 0 ? `, plus ${hours(tallyWeek(week, {}).pt)} of a+ extras` : ""}
          </p>
          {renderDue(week.due)}
          <div className="space-y-10">
            {(["admin", "stat", "phys", "hist"] as Tag[]).map((tag) =>
              week.tasks.some(([t]) => t === tag) ? (
                <div key={tag}>
                  <h3 className="text-white font-semibold mb-3">
                    {tag === "admin" ? "do first" : COURSE_NAME[tag as CourseKey]}
                  </h3>
                  {renderTasks(week, tag)}
                </div>
              ) : null,
            )}
          </div>
        </section>
      ) : tab === "term" ? (
        <section className="animate-fade-in-up space-y-4">
          <Heading>whole term</Heading>
          {WEEKS.map((w) => {
            return (
              <details
                key={w.n}
                open={w.n === week.n}
                className="group border border-gray-800 p-6 transition-colors hover:border-accent/50"
              >
                <summary className="cursor-pointer list-none flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-xl font-semibold text-white group-hover:text-accent transition-colors">
                    {w.exam ? "exams" : w.brk ? "break" : `w${w.n}`}: {w.title}
                  </span>
                  <span className="text-sm text-gray-600">
                    {fmt(w.start)} to {fmt(w.end)}
                  </span>
                  <span className="text-sm text-gray-400 ml-auto">{weekLine(w, 8)}</span>
                </summary>
                <div className="mt-4">
                  {w.note && <p className="text-sm text-gray-400">{w.note}</p>}
                  {renderDue(w.due)}
                  {renderTasks(w)}
                </div>
              </details>
            );
          })}
          <div className="border border-gray-800 p-6 mt-8">
            <h3 className="text-xl font-semibold text-white mb-2">history continues in winter</h3>
            <p className="text-sm text-gray-400">start assignment 4 over the winter holiday. the big papers are worth double.</p>
            {renderDue(WINTER.map(([w, t]) => ["hist", w, t] as [Tag, string, string]))}
          </div>
        </section>
      ) : tab === "grades" ? (
        <section className="animate-fade-in-up">
          <Heading>grades</Heading>
          <p className="text-gray-400 mb-10 leading-relaxed text-sm">
            marks go in as percentages when they come back. each table shows the average needed on everything
            left to land that grade. a+ is taken as 90 where the outline doesn&apos;t give a cutoff.
          </p>
          <TermGpa scores={state.scores} />
          <div className="space-y-12 mt-12">
            {(Object.keys(COURSES) as CourseKey[]).map((key) => (
              <GradeCard key={key} course={key} scores={state.scores} onScore={setScore} />
            ))}
          </div>
        </section>
      ) : (
        <section className="animate-fade-in-up space-y-12">
          <div>
            <Heading>notes</Heading>
            <div className="space-y-6">
              {(Object.keys(NOTES) as CourseKey[]).map((k) => (
                <div key={k}>
                  <h3 className="text-white font-semibold mb-2">{COURSE_NAME[k]}</h3>
                  <p className="text-gray-400 leading-relaxed text-sm">{NOTES[k]}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Heading>resources</Heading>
            <div className="space-y-10">
              {(Object.keys(RESOURCES) as CourseKey[]).map((k) => (
                <div key={k}>
                  <h3 className="text-white font-semibold mb-3">{COURSE_NAME[k]}</h3>
                  <ul className="space-y-4">
                    {RESOURCES[k].map((r) => (
                      <li key={r.name} className="text-sm">
                        <div className="flex flex-wrap items-baseline gap-x-3">
                          {r.url ? (
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group inline-flex items-center gap-1 text-gray-200 hover:text-accent transition-colors duration-200"
                            >
                              {r.name}
                              <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" />
                            </a>
                          ) : (
                            <span className="text-gray-200">{r.name}</span>
                          )}
                          <span className="px-2 py-1 text-xs text-gray-300 bg-gray-800/50 rounded">{r.time}</span>
                        </div>
                        <p className="text-gray-400 mt-1">{r.why}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="mt-16 pt-6 border-t border-gray-800 text-xs text-gray-600">
        {syncKey ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={sync === "error" || sync === "wrong key" ? "text-accent" : ""}>[{syncLabel[sync]}]</span>
            <button onClick={disconnect} className="hover:text-accent transition-colors">
              [stop syncing on this device]
            </button>
          </p>
        ) : (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void connect();
            }}
          >
            <span className={sync === "wrong key" || sync === "error" ? "text-accent" : ""}>[{syncLabel[sync]}]</span>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sync key"
              aria-label="sync key"
              autoComplete="current-password"
              className="bg-transparent border border-gray-800 rounded px-2 py-1 text-gray-300 outline-none focus:border-accent/50 w-40"
            />
            <button type="submit" className="hover:text-accent transition-colors">
              [sync]
            </button>
          </form>
        )}
      </footer>
    </main>
  );
}

function Progress({
  done, now, showPlus, onFlip,
}: {
  done: Record<string, boolean>;
  now: Date;
  showPlus: boolean;
  onFlip: () => void;
}) {
  const t = tallyTerm(done);
  const exp = expectedCore(now);
  const gap = t.cd - exp;
  const pace =
    gap >= -45
      ? `on pace${gap >= 60 ? `, ~${hours(gap)} ahead` : ""}`
      : `~${hours(-gap)} behind pace`;
  const full = [t.cd + t.pd, t.ct + t.pt] as const;
  return (
    <section className="mb-10 text-sm" aria-label="term progress">
      <div className="space-y-1 text-gray-400">
        <p className="flex flex-wrap gap-x-3">
          <span className="text-white w-28 shrink-0">core (b+ to a)</span>
          <span className="text-accent">{asciiBar(t.cd, t.ct)}</span>
          <span className="text-white">{pct(t.cd, t.ct)}%</span>
          <span className="text-gray-600">
            {hours(t.cd)} of {hours(t.ct)}
          </span>
        </p>
        {showPlus && (
          <p className="flex flex-wrap gap-x-3">
            <span className="text-white w-28 shrink-0">with a+</span>
            <span className="text-accent">{asciiBar(...full)}</span>
            <span className="text-white">{pct(...full)}%</span>
            <span className="text-gray-600">
              {hours(full[0])} of {hours(full[1])}
            </span>
          </p>
        )}
        {(["stat", "phys", "hist"] as CourseKey[]).map((c) => {
          const x = tallyTerm(done, c);
          const [d, n] = showPlus ? [x.cd + x.pd, x.ct + x.pt] : [x.cd, x.ct];
          return (
            <p key={c} className="flex flex-wrap gap-x-3">
              <span className="w-28 shrink-0">{COURSE_NAME[c]}</span>
              <span className="text-gray-500">{asciiBar(d, n)}</span>
              <span>{pct(d, n)}%</span>
            </p>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
        <span>
          should be at {pct(exp, t.ct)}% core by today.{" "}
          <span className={gap < -45 ? "text-accent" : "text-gray-400"}>{pace}</span>
        </span>
        <button onClick={onFlip} className="hover:text-accent transition-colors">
          [{showPlus ? "hide" : "show"} a+ extras]
        </button>
      </p>
    </section>
  );
}

function TermGpa({ scores }: { scores: Scores }) {
  const s = standing("stat", scores);
  const p = standing("phys", scores);
  if (s.current === null || p.current === null) {
    return (
      <div className="border border-gray-800 p-6 text-sm text-gray-400 leading-relaxed">
        fall term gpa comes from statistics and physics only, since history finishes in april. enter a mark in
        both to see the projection.
      </div>
    );
  }
  const [ls, gs] = letter(s.current);
  const [lp, gp] = letter(p.current);
  const gpa = (gs + gp) / 2;
  return (
    <div className="border border-gray-800 p-6 bg-gradient-to-r from-accent/10 to-transparent">
      <p className="text-sm text-gray-400 mb-2">projected fall term gpa (stats {ls}, physics {lp})</p>
      <p className={`text-4xl font-bold ${gpa >= 3 ? "text-white" : gpa >= 2 ? "text-gray-300" : "text-accent"}`}>
        {gpa.toFixed(2)}
      </p>
    </div>
  );
}

function GradeCard({
  course, scores, onScore,
}: {
  course: CourseKey;
  scores: Scores;
  onScore: (c: CourseKey, id: string, v: string) => void;
}) {
  const C = COURSES[course];
  const st = standing(course, scores);
  return (
    <div className="group border border-gray-800 p-6 transition-colors hover:border-accent/50">
      <h3 className="text-2xl font-bold text-white group-hover:text-accent transition-colors mb-2">
        {COURSE_NAME[course]}
      </h3>
      <p className="text-sm text-gray-400 mb-6">{C.note}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-600 text-left">
              <th className="font-normal pb-2">item</th>
              <th className="font-normal pb-2 text-right">weight</th>
              <th className="font-normal pb-2 text-right">mark %</th>
            </tr>
          </thead>
          <tbody>
            {C.items.map(([id, label, w]) => {
              const v = scores[course]?.[id];
              return (
                <tr key={id} className="border-t border-gray-800">
                  <td className="py-2 text-gray-300">{label}</td>
                  <td className="py-2 text-right text-gray-400">{w}%</td>
                  <td className="py-2 text-right">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step={0.1}
                      aria-label={`${COURSE_NAME[course]} ${label} mark`}
                      value={v ?? ""}
                      onChange={(e) => onScore(course, id, e.target.value)}
                      className="w-20 bg-transparent border border-gray-800 rounded px-2 py-1 text-right text-gray-200 outline-none focus:border-accent/50"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-gray-400 mt-6 mb-3">
        {st.current === null
          ? "no marks yet. right now a b means 70% on everything."
          : `current ${st.current.toFixed(1)}% (${letter(st.current)[0]}), ${st.weighted}% of the course graded`}
      </p>
      <div className="space-y-1 text-sm">
        {TARGETS.map(([l, t]) => {
          let text: string;
          let cls: string;
          if (st.remaining <= 0) {
            const ok = st.earned >= t;
            text = ok ? "done" : "missed";
            cls = ok ? "text-white" : "text-gray-600";
          } else {
            const need = ((t - st.earned) / st.remaining) * 100;
            if (need <= 0) { text = "locked in"; cls = "text-white"; }
            else if (need > 100) { text = "out of reach"; cls = "text-gray-600 line-through"; }
            else { text = `${need.toFixed(1)}% avg on the rest`; cls = need > 85 ? "text-accent" : "text-gray-300"; }
          }
          return (
            <p key={l} className="flex gap-3">
              <span className="text-gray-600 w-16 shrink-0">{l} ({t})</span>
              <span className={cls}>{text}</span>
            </p>
          );
        })}
      </div>
    </div>
  );
}
