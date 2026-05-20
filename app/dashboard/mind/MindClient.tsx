"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MeditationLog = {
  id: string;
  date: string;
  minutes: number;
  notes: string | null;
};

type JournalEntry = {
  id: string;
  date: string;
  content: string;
  mood: number;
  grateful: string | null;
};

type FocusSession = {
  id: string;
  date: string;
  minutes: number;
  task: string | null;
};

type ScreenTimeLog = {
  id: string;
  date: string;
  minutes: number;
  app: string;
};

type TabKey = "meditation" | "journal" | "focus" | "screentime";

const TABS: { key: TabKey; label: string }[] = [
  { key: "meditation", label: "Meditation" },
  { key: "journal", label: "Journal" },
  { key: "focus", label: "Focus" },
  { key: "screentime", label: "Screen Time" },
];

const QUOTES = [
  "The mind is everything. What you think you become.",
  "Quiet the mind, and the soul will speak.",
  "Wherever you are, be there totally.",
  "Peace comes from within. Do not seek it without.",
  "You are the sky. Everything else is just the weather.",
  "Breathe in deeply to bring your mind home to your body.",
  "Be where you are; otherwise you will miss your life.",
  "The present moment is the only moment available to us.",
  "Don't believe everything you think.",
  "Feelings come and go like clouds in a windy sky.",
  "Almost everything will work again if you unplug it — including you.",
  "Discipline is the bridge between goals and accomplishment.",
  "Small steps every day.",
  "Your calm mind is the ultimate weapon against your challenges.",
];

const MEDITATION_OPTIONS = [5, 10, 15, 20, 30];
const POMODORO_WORK = 25 * 60;
const POMODORO_BREAK = 5 * 60;
const SCREEN_TIME_WARNING = 120;
const COMMON_APPS = ["Instagram", "YouTube", "Twitter", "TikTok", "Reddit", "Other"];

function startOfDay(d: Date) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfWeek(d: Date) {
  const out = startOfDay(d);
  const day = out.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  return out;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatMMSS(totalSeconds: number) {
  const mm = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mm}:${ss}`;
}

function dailyQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return QUOTES[dayOfYear % QUOTES.length];
}

function moodEmoji(mood: number) {
  if (mood <= 2) return "😞";
  if (mood <= 4) return "😕";
  if (mood <= 6) return "😐";
  if (mood <= 8) return "🙂";
  return "😄";
}

export default function MindClient() {
  const [tab, setTab] = useState<TabKey>("meditation");
  const [meditationLogs, setMeditationLogs] = useState<MeditationLog[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [screenTimeLogs, setScreenTimeLogs] = useState<ScreenTimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [m, j, f, s] = await Promise.all([
        fetch("/api/mind/meditation", { cache: "no-store" }),
        fetch("/api/mind/journal", { cache: "no-store" }),
        fetch("/api/mind/focus", { cache: "no-store" }),
        fetch("/api/mind/screentime", { cache: "no-store" }),
      ]);
      if (!m.ok) throw new Error("Failed to load meditation");
      if (!j.ok) throw new Error("Failed to load journal");
      if (!f.ok) throw new Error("Failed to load focus");
      if (!s.ok) throw new Error("Failed to load screen time");
      const mJson = await m.json();
      const jJson = await j.json();
      const fJson = await f.json();
      const sJson = await s.json();
      setMeditationLogs(mJson.meditationLogs ?? []);
      setJournalEntries(jJson.journalEntries ?? []);
      setFocusSessions(fJson.focusSessions ?? []);
      setScreenTimeLogs(sJson.screenTimeLogs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchAll();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchAll]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const meditationStreak = useMemo(() => {
    if (meditationLogs.length === 0) return 0;
    const days = new Set<string>();
    for (const log of meditationLogs) {
      const d = startOfDay(new Date(log.date));
      days.add(d.toISOString().slice(0, 10));
    }
    let streak = 0;
    const cursor = new Date(today);
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (days.has(key)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (streak === 0 && isSameDay(cursor, today)) {
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [meditationLogs, today]);

  const todayMood = useMemo(() => {
    const todays = journalEntries.filter((e) =>
      isSameDay(new Date(e.date), today)
    );
    if (todays.length === 0) return null;
    return todays[0].mood;
  }, [journalEntries, today]);

  const todayFocusMinutes = useMemo(
    () =>
      focusSessions
        .filter((f) => isSameDay(new Date(f.date), today))
        .reduce((sum, f) => sum + f.minutes, 0),
    [focusSessions, today]
  );

  const todayScreenMinutes = useMemo(
    () =>
      screenTimeLogs
        .filter((s) => isSameDay(new Date(s.date), today))
        .reduce((sum, s) => sum + s.minutes, 0),
    [screenTimeLogs, today]
  );

  return (
    <div className="mt-8 space-y-8">
      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Meditation streak"
          value={`${meditationStreak}`}
          suffix={meditationStreak === 1 ? " day" : " days"}
          tone="violet"
        />
        <SummaryCard
          label="Today's mood"
          value={todayMood !== null ? `${todayMood}/10` : "—"}
          suffix={todayMood !== null ? ` ${moodEmoji(todayMood)}` : ""}
          tone="indigo"
        />
        <SummaryCard
          label="Focus today"
          value={`${todayFocusMinutes}`}
          suffix=" min"
          tone="sky"
        />
        <SummaryCard
          label="Screen time today"
          value={`${todayScreenMinutes}`}
          suffix=" min"
          tone={todayScreenMinutes > SCREEN_TIME_WARNING ? "rose" : "blue"}
        />
      </section>

      <div className="rounded-2xl border border-border/60 bg-surface/60 shadow-card">
        <div className="flex overflow-x-auto border-b border-border/60">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors ${
                tab === t.key ? "text-white" : "text-muted hover:text-white"
              }`}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (
            <>
              {tab === "meditation" && (
                <MeditationTab
                  logs={meditationLogs}
                  streak={meditationStreak}
                  today={today}
                  onChange={fetchAll}
                  onError={setError}
                />
              )}
              {tab === "journal" && (
                <JournalTab
                  entries={journalEntries}
                  onChange={fetchAll}
                  onError={setError}
                />
              )}
              {tab === "focus" && (
                <FocusTab
                  sessions={focusSessions}
                  today={today}
                  todayMinutes={todayFocusMinutes}
                  onChange={fetchAll}
                  onError={setError}
                />
              )}
              {tab === "screentime" && (
                <ScreenTimeTab
                  logs={screenTimeLogs}
                  today={today}
                  todayMinutes={todayScreenMinutes}
                  onChange={fetchAll}
                  onError={setError}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- MEDITATION TAB ---------------- */

function MeditationTab({
  logs,
  streak,
  today,
  onChange,
  onError,
}: {
  logs: MeditationLog[];
  streak: number;
  today: Date;
  onChange: () => Promise<void>;
  onError: (e: string | null) => void;
}) {
  const [selectedMinutes, setSelectedMinutes] = useState(10);
  const [remaining, setRemaining] = useState(10 * 60);
  const [running, setRunning] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  const logCompletedSession = useCallback(
    async (minutes: number) => {
      try {
        const res = await fetch("/api/mind/meditation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minutes }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to log session");
        }
        await onChange();
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to log session");
      }
    },
    [onChange, onError]
  );

  useEffect(() => {
    if (running && remaining === 0 && !completedRef.current) {
      completedRef.current = true;
      setRunning(false);
      void logCompletedSession(selectedMinutes);
    }
  }, [running, remaining, selectedMinutes, logCompletedSession]);

  function pickMinutes(m: number) {
    if (running) return;
    setSelectedMinutes(m);
    setRemaining(m * 60);
    completedRef.current = false;
  }

  function start() {
    if (remaining === 0) {
      setRemaining(selectedMinutes * 60);
      completedRef.current = false;
    }
    setRunning(true);
  }
  function pause() {
    setRunning(false);
  }
  function stop() {
    setRunning(false);
    setRemaining(selectedMinutes * 60);
    completedRef.current = false;
  }

  const last7Days = useMemo(() => {
    const out: { label: string; minutes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const minutes = logs
        .filter((l) => isSameDay(new Date(l.date), d))
        .reduce((s, l) => s + l.minutes, 0);
      out.push({
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        minutes,
      });
    }
    return out;
  }, [logs, today]);

  async function handleDelete(id: string) {
    if (deletingId) return;
    if (!window.confirm("Delete this meditation session?")) return;
    setDeletingId(id);
    onError(null);
    try {
      const res = await fetch(
        `/api/mind/meditation?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete");
      }
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  const progress = 1 - remaining / (selectedMinutes * 60);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatPill
          label="Streak"
          value={`${streak} day${streak === 1 ? "" : "s"}`}
        />
        <StatPill label="Sessions logged" value={`${logs.length}`} />
      </div>

      <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-violet-500/10 via-surface-2/40 to-indigo-500/10 p-6">
        <h3 className="text-sm font-semibold text-white">Timer</h3>

        <div className="mt-4 flex flex-wrap gap-2">
          {MEDITATION_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => pickMinutes(m)}
              disabled={running}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                selectedMinutes === m
                  ? "border-accent bg-accent-soft text-white"
                  : "border-border bg-surface-2/40 text-muted hover:text-white"
              }`}
            >
              {m} min
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="relative h-44 w-44 sm:h-52 sm:w-52">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="rgba(127, 119, 221, 0.15)"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#7F77DD"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress)}`}
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-semibold tabular-nums text-white sm:text-5xl">
                {formatMMSS(remaining)}
              </span>
              <span className="mt-1 text-xs uppercase tracking-wider text-muted">
                {running ? "Breathe…" : remaining === 0 ? "Complete" : "Ready"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {!running ? (
              <button
                type="button"
                onClick={start}
                className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Start
              </button>
            ) : (
              <button
                type="button"
                onClick={pause}
                className="rounded-lg bg-amber-500/20 px-5 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-500/30"
              >
                Pause
              </button>
            )}
            <button
              type="button"
              onClick={stop}
              className="rounded-lg border border-border bg-surface-2/40 px-5 py-2 text-sm font-medium text-muted transition-colors hover:text-white"
            >
              Stop
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Last 7 days</h3>
          <span className="text-xs text-muted">Minutes meditated</span>
        </div>
        <div className="mt-4 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7Days} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1F2A52" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#9AA3C7"
                tick={{ fill: "#9AA3C7", fontSize: 12 }}
                axisLine={{ stroke: "#1F2A52" }}
                tickLine={false}
              />
              <YAxis
                stroke="#9AA3C7"
                tick={{ fill: "#9AA3C7", fontSize: 12 }}
                axisLine={{ stroke: "#1F2A52" }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(127, 119, 221, 0.08)" }}
                contentStyle={{
                  background: "#0E1430",
                  border: "1px solid #1F2A52",
                  borderRadius: 8,
                  color: "#fff",
                }}
                formatter={(v) => `${v} min`}
              />
              <Bar dataKey="minutes" radius={[6, 6, 0, 0]} fill="#7F77DD" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-white">Recent sessions</h3>
        {logs.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No sessions yet — start the timer above.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/60">
            {logs.slice(0, 10).map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm text-white">{formatShortDate(l.date)}</p>
                  <p className="text-xs text-muted">
                    {l.minutes} min{l.notes ? ` · ${l.notes}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(l.id)}
                  disabled={deletingId === l.id}
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Delete session"
                  title="Delete"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------------- JOURNAL TAB ---------------- */

function JournalTab({
  entries,
  onChange,
  onError,
}: {
  entries: JournalEntry[];
  onChange: () => Promise<void>;
  onError: (e: string | null) => void;
}) {
  const [mood, setMood] = useState(7);
  const [grateful, setGrateful] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const quote = useMemo(() => dailyQuote(), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    onError(null);
    if (!content.trim()) {
      onError("Write something before saving");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/mind/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          mood,
          grateful: grateful.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save entry");
      }
      setContent("");
      setGrateful("");
      setMood(7);
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    if (!window.confirm("Delete this entry?")) return;
    setDeletingId(id);
    onError(null);
    try {
      const res = await fetch(`/api/mind/journal?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete");
      }
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-blue-500/10 px-5 py-4">
        <p className="text-xs uppercase tracking-wider text-violet-300">
          Today&apos;s reflection
        </p>
        <p className="mt-1 text-sm italic text-white">&ldquo;{quote}&rdquo;</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border/60 bg-surface-2/40 p-5">
        <h3 className="text-sm font-semibold text-white">New entry</h3>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Mood check-in
            </span>
            <span className="text-sm text-white">
              {moodEmoji(mood)} {mood}/10
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={mood}
            onChange={(e) => setMood(parseInt(e.target.value, 10))}
            className="mt-2 w-full accent-[#7F77DD]"
          />
          <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-muted/70">
            <span>Low</span>
            <span>Calm</span>
            <span>Great</span>
          </div>
        </div>

        <Field label="What are you grateful for today?">
          <textarea
            rows={3}
            value={grateful}
            onChange={(e) => setGrateful(e.target.value)}
            className={`${inputClass} resize-none`}
            placeholder="Three small things…"
          />
        </Field>

        <Field label="Journal">
          <textarea
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`${inputClass} resize-none`}
            placeholder="Write your thoughts…"
            required
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save entry"}
        </button>
      </form>

      <section>
        <h3 className="text-sm font-semibold text-white">Recent entries</h3>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No entries yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {entries.slice(0, 5).map((e) => {
              const expanded = expandedId === e.id;
              return (
                <li
                  key={e.id}
                  className="rounded-xl border border-border/60 bg-surface-2/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{moodEmoji(e.mood)}</span>
                        <p className="text-sm font-medium text-white">
                          {new Date(e.date).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <span className="text-xs text-muted">· {e.mood}/10</span>
                      </div>
                      <p
                        className={`mt-2 whitespace-pre-wrap text-sm text-muted ${
                          expanded ? "" : "line-clamp-2"
                        }`}
                      >
                        {e.content}
                      </p>
                      {expanded && e.grateful && (
                        <div className="mt-3 rounded-lg bg-violet-500/10 px-3 py-2">
                          <p className="text-xs uppercase tracking-wider text-violet-300">
                            Grateful for
                          </p>
                          <p className="mt-1 text-sm text-white">{e.grateful}</p>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : e.id)}
                        className="mt-2 text-xs font-medium text-accent hover:underline"
                      >
                        {expanded ? "Show less" : "Show more"}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(e.id)}
                      disabled={deletingId === e.id}
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Delete entry"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------------- FOCUS TAB ---------------- */

function FocusTab({
  sessions,
  today,
  todayMinutes,
  onChange,
  onError,
}: {
  sessions: FocusSession[];
  today: Date;
  todayMinutes: number;
  onChange: () => Promise<void>;
  onError: (e: string | null) => void;
}) {
  const [task, setTask] = useState("");
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [remaining, setRemaining] = useState(POMODORO_WORK);
  const [running, setRunning] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  const logFocusSession = useCallback(
    async (minutes: number, taskName: string) => {
      try {
        const res = await fetch("/api/mind/focus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            minutes,
            task: taskName.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to log session");
        }
        await onChange();
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to log session");
      }
    },
    [onChange, onError]
  );

  useEffect(() => {
    if (running && remaining === 0 && !finishedRef.current) {
      finishedRef.current = true;
      setRunning(false);
      if (phase === "work") {
        void logFocusSession(25, task);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPhase("break");
        setRemaining(POMODORO_BREAK);
      } else {
        setPhase("work");
        setRemaining(POMODORO_WORK);
      }
      setTimeout(() => {
        finishedRef.current = false;
      }, 100);
    }
  }, [running, remaining, phase, task, logFocusSession]);

  function start() {
    setRunning(true);
  }
  function pause() {
    setRunning(false);
  }
  function reset() {
    setRunning(false);
    setPhase("work");
    setRemaining(POMODORO_WORK);
    finishedRef.current = false;
  }

  const todayCount = useMemo(
    () => sessions.filter((s) => isSameDay(new Date(s.date), today)).length,
    [sessions, today]
  );

  const weekStart = useMemo(() => startOfWeek(today), [today]);

  const weeklyData = useMemo(() => {
    const out: { label: string; minutes: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const minutes = sessions
        .filter((s) => isSameDay(new Date(s.date), d))
        .reduce((sum, s) => sum + s.minutes, 0);
      out.push({
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        minutes,
      });
    }
    return out;
  }, [sessions, weekStart]);

  const total = phase === "work" ? POMODORO_WORK : POMODORO_BREAK;
  const progress = 1 - remaining / total;
  const ringColor = phase === "work" ? "#7F77DD" : "#34D399";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatPill
          label="Sessions today"
          value={`${todayCount}`}
        />
        <StatPill label="Focus minutes today" value={`${todayMinutes}`} />
      </div>

      <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-indigo-500/10 via-surface-2/40 to-violet-500/10 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Pomodoro</h3>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              phase === "work"
                ? "bg-accent-soft text-accent"
                : "bg-emerald-500/15 text-emerald-300"
            }`}
          >
            {phase === "work" ? "Work · 25 min" : "Break · 5 min"}
          </span>
        </div>

        <div className="mt-5">
          <Field label="What are you working on?">
            <input
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className={inputClass}
              placeholder="e.g. Draft Q3 strategy doc"
            />
          </Field>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="relative h-44 w-44 sm:h-52 sm:w-52">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="rgba(127, 119, 221, 0.15)"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke={ringColor}
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress)}`}
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-semibold tabular-nums text-white sm:text-5xl">
                {formatMMSS(remaining)}
              </span>
              <span className="mt-1 text-xs uppercase tracking-wider text-muted">
                {running ? (phase === "work" ? "Deep work" : "Recharge") : "Ready"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {!running ? (
              <button
                type="button"
                onClick={start}
                className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Start
              </button>
            ) : (
              <button
                type="button"
                onClick={pause}
                className="rounded-lg bg-amber-500/20 px-5 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-500/30"
              >
                Pause
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-border bg-surface-2/40 px-5 py-2 text-sm font-medium text-muted transition-colors hover:text-white"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">This week</h3>
          <span className="text-xs text-muted">Focus minutes</span>
        </div>
        <div className="mt-4 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1F2A52" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#9AA3C7"
                tick={{ fill: "#9AA3C7", fontSize: 12 }}
                axisLine={{ stroke: "#1F2A52" }}
                tickLine={false}
              />
              <YAxis
                stroke="#9AA3C7"
                tick={{ fill: "#9AA3C7", fontSize: 12 }}
                axisLine={{ stroke: "#1F2A52" }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(127, 119, 221, 0.08)" }}
                contentStyle={{
                  background: "#0E1430",
                  border: "1px solid #1F2A52",
                  borderRadius: 8,
                  color: "#fff",
                }}
                formatter={(v) => `${v} min`}
              />
              <Bar dataKey="minutes" radius={[6, 6, 0, 0]} fill="#7F77DD" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

/* ---------------- SCREEN TIME TAB ---------------- */

function ScreenTimeTab({
  logs,
  today,
  todayMinutes,
  onChange,
  onError,
}: {
  logs: ScreenTimeLog[];
  today: Date;
  todayMinutes: number;
  onChange: () => Promise<void>;
  onError: (e: string | null) => void;
}) {
  const [appName, setAppName] = useState("Instagram");
  const [customApp, setCustomApp] = useState("");
  const [minutes, setMinutes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const last7Days = useMemo(() => {
    const out: { label: string; minutes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const total = logs
        .filter((l) => isSameDay(new Date(l.date), d))
        .reduce((s, l) => s + l.minutes, 0);
      out.push({
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        minutes: total,
      });
    }
    return out;
  }, [logs, today]);

  const weeklyAvg = useMemo(() => {
    const total = last7Days.reduce((s, d) => s + d.minutes, 0);
    return Math.round(total / 7);
  }, [last7Days]);

  const todayLogs = useMemo(
    () =>
      logs.filter((l) => isSameDay(new Date(l.date), today)),
    [logs, today]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    onError(null);
    const chosen = appName === "Other" ? customApp.trim() : appName;
    if (!chosen) {
      onError("App name is required");
      return;
    }
    const minutesNum = parseInt(minutes, 10);
    if (!Number.isFinite(minutesNum) || minutesNum <= 0) {
      onError("Minutes must be a positive number");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/mind/screentime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app: chosen, minutes: minutesNum }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to log screen time");
      }
      setMinutes("");
      setCustomApp("");
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to log screen time");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    if (!window.confirm("Delete this screen time log?")) return;
    setDeletingId(id);
    onError(null);
    try {
      const res = await fetch(
        `/api/mind/screentime?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete");
      }
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  const over = todayMinutes > SCREEN_TIME_WARNING;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatPill
          label="Today total"
          value={`${todayMinutes} min`}
        />
        <StatPill label="Weekly average" value={`${weeklyAvg} min/day`} />
      </div>

      {over && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          ⚠️ You&apos;re over 2 hours of tracked screen time today — consider a screen-free break.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-border/60 bg-surface-2/40 p-4"
      >
        <h3 className="text-sm font-semibold text-white">Log app time</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="App">
            <select
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className={inputClass}
            >
              {COMMON_APPS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>
          {appName === "Other" ? (
            <Field label="App name">
              <input
                type="text"
                value={customApp}
                onChange={(e) => setCustomApp(e.target.value)}
                className={inputClass}
                placeholder="e.g. WhatsApp"
              />
            </Field>
          ) : (
            <Field label="App name">
              <input
                type="text"
                value={appName}
                disabled
                className={`${inputClass} opacity-60`}
              />
            </Field>
          )}
          <Field label="Minutes">
            <input
              type="number"
              min="1"
              required
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className={inputClass}
              placeholder="e.g. 45"
            />
          </Field>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Log time"}
        </button>
      </form>

      <section className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Last 7 days</h3>
          <span className="text-xs text-muted">Total minutes</span>
        </div>
        <div className="mt-4 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7Days} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1F2A52" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#9AA3C7"
                tick={{ fill: "#9AA3C7", fontSize: 12 }}
                axisLine={{ stroke: "#1F2A52" }}
                tickLine={false}
              />
              <YAxis
                stroke="#9AA3C7"
                tick={{ fill: "#9AA3C7", fontSize: 12 }}
                axisLine={{ stroke: "#1F2A52" }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(96, 165, 250, 0.08)" }}
                contentStyle={{
                  background: "#0E1430",
                  border: "1px solid #1F2A52",
                  borderRadius: 8,
                  color: "#fff",
                }}
                formatter={(v) => `${v} min`}
              />
              <Bar dataKey="minutes" radius={[6, 6, 0, 0]} fill="#60A5FA" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-white">Today&apos;s logs</h3>
        {todayLogs.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No screen time logged today.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/60">
            {todayLogs.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{l.app}</p>
                  <p className="text-xs text-muted">
                    {new Date(l.date).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">
                    {l.minutes} min
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(l.id)}
                    disabled={deletingId === l.id}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Delete log"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------------- SHARED ---------------- */

const inputClass =
  "w-full rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm text-white placeholder:text-muted/70 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryCard({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone: "violet" | "indigo" | "sky" | "blue" | "rose";
}) {
  const toneStyles: Record<typeof tone, string> = {
    violet: "text-violet-300",
    indigo: "text-indigo-300",
    sky: "text-sky-300",
    blue: "text-blue-300",
    rose: "text-rose-300",
  };
  return (
    <div className="rounded-2xl border border-border/60 bg-surface/60 p-4 shadow-card sm:p-5">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneStyles[tone]}`}>
        {value}
        {suffix && <span className="text-sm text-muted">{suffix}</span>}
      </p>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface-2/40 px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
    </svg>
  );
}
