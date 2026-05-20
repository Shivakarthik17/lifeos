"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Habit = {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  color: string;
  createdAt: string;
};

type HabitCheckIn = {
  id: string;
  habitId: string;
  userId: string;
  date: string;
};

type DailyRoutine = {
  id: string;
  date: string;
  wakeTime: string | null;
  sleepTime: string | null;
  rating: number;
  notes: string | null;
};

type TabKey = "habits" | "routine" | "progress";

const TABS: { key: TabKey; label: string }[] = [
  { key: "habits", label: "Habits" },
  { key: "routine", label: "Routine" },
  { key: "progress", label: "Progress" },
];

const DEFAULT_HABITS = [
  "Wake up by 6am",
  "No Instagram before 9am",
  "Meditate 10 mins",
  "Read something useful",
  "Work on business idea",
  "No junk food",
  "Exercise/Gym",
] as const;

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

function dayKey(d: Date) {
  return startOfDay(d).toISOString().slice(0, 10);
}

function computeStreak(checkIns: HabitCheckIn[], habitId: string, today: Date) {
  const days = new Set<string>();
  for (const c of checkIns) {
    if (c.habitId !== habitId) continue;
    days.add(dayKey(new Date(c.date)));
  }
  if (days.size === 0) return 0;
  let streak = 0;
  const cursor = new Date(today);
  while (true) {
    const key = dayKey(cursor);
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
}

function parseTimeToMinutes(t: string | null) {
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hours = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
  return hours * 60 + mins;
}

function minutesToTimeLabel(mins: number | null) {
  if (mins === null) return "—";
  const h = Math.floor(mins / 60) % 24;
  const m = Math.round(mins % 60);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function DisciplineClient() {
  const [tab, setTab] = useState<TabKey>("habits");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkIns, setCheckIns] = useState<HabitCheckIn[]>([]);
  const [routines, setRoutines] = useState<DailyRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [h, c, r] = await Promise.all([
        fetch("/api/discipline/habits", { cache: "no-store" }),
        fetch("/api/discipline/checkins", { cache: "no-store" }),
        fetch("/api/discipline/routine", { cache: "no-store" }),
      ]);
      if (!h.ok) throw new Error("Failed to load habits");
      if (!c.ok) throw new Error("Failed to load check-ins");
      if (!r.ok) throw new Error("Failed to load routines");
      const hJ = await h.json();
      const cJ = await c.json();
      const rJ = await r.json();
      setHabits(hJ.habits ?? []);
      setCheckIns(cJ.checkIns ?? []);
      setRoutines(rJ.routines ?? []);
      return (hJ.habits ?? []) as Habit[];
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      return [] as Habit[];
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fetched = await fetchAll();
      if (cancelled) return;
      if (fetched.length === 0 && !seeded) {
        setSeeded(true);
        try {
          for (const name of DEFAULT_HABITS) {
            const res = await fetch("/api/discipline/habits", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name }),
            });
            if (!res.ok) break;
          }
          if (!cancelled) await fetchAll();
        } catch {
          // ignore seed errors
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchAll, seeded]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const todayCheckedIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of checkIns) {
      if (isSameDay(new Date(c.date), today)) set.add(c.habitId);
    }
    return set;
  }, [checkIns, today]);

  const disciplineScore = useMemo(() => {
    if (habits.length === 0) return 0;
    return Math.round((todayCheckedIds.size / habits.length) * 100);
  }, [todayCheckedIds, habits]);

  return (
    <div className="mt-8 space-y-8">
      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Today's score"
          value={`${disciplineScore}%`}
          tone="violet"
        />
        <SummaryCard
          label="Habits hit today"
          value={`${todayCheckedIds.size}/${habits.length}`}
          tone="emerald"
        />
        <SummaryCard
          label="Active habits"
          value={`${habits.length}`}
          tone="sky"
        />
        <SummaryCard
          label="Routines logged"
          value={`${routines.length}`}
          tone="amber"
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
              {tab === "habits" && (
                <HabitsTab
                  habits={habits}
                  checkIns={checkIns}
                  today={today}
                  todayCheckedIds={todayCheckedIds}
                  disciplineScore={disciplineScore}
                  onChange={fetchAll}
                  onError={setError}
                />
              )}
              {tab === "routine" && (
                <RoutineTab
                  routines={routines}
                  today={today}
                  onChange={fetchAll}
                  onError={setError}
                />
              )}
              {tab === "progress" && (
                <ProgressTab
                  habits={habits}
                  checkIns={checkIns}
                  today={today}
                  disciplineScore={disciplineScore}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- HABITS ---------------- */

function HabitsTab({
  habits,
  checkIns,
  today,
  todayCheckedIds,
  disciplineScore,
  onChange,
  onError,
}: {
  habits: Habit[];
  checkIns: HabitCheckIn[];
  today: Date;
  todayCheckedIds: Set<string>;
  disciplineScore: number;
  onChange: () => Promise<Habit[]>;
  onError: (e: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    onError(null);
    if (!name.trim()) {
      onError("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/discipline/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add habit");
      }
      setName("");
      setShowAdd(false);
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to add habit");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggle(habitId: string) {
    if (togglingId) return;
    setTogglingId(habitId);
    onError(null);
    try {
      const res = await fetch("/api/discipline/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update");
      }
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    if (!window.confirm("Delete this habit? All check-ins will be removed.")) return;
    setDeletingId(id);
    onError(null);
    try {
      const res = await fetch(`/api/discipline/habits?id=${encodeURIComponent(id)}`, {
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

  const weekDays = useMemo(() => {
    const out: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      out.push(d);
    }
    return out;
  }, [today]);

  const checkInIndex = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const c of checkIns) {
      const key = dayKey(new Date(c.date));
      let set = map.get(key);
      if (!set) {
        set = new Set<string>();
        map.set(key, set);
      }
      set.add(c.habitId);
    }
    return map;
  }, [checkIns]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-surface-2/40 to-indigo-500/10 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-violet-300">
              Today
            </p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {disciplineScore}%
              <span className="ml-2 text-sm font-normal text-muted">
                discipline
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd((s) => !s)}
            className="rounded-lg border border-border bg-surface-2/60 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-soft"
          >
            {showAdd ? "Cancel" : "+ Add habit"}
          </button>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all"
            style={{ width: `${disciplineScore}%` }}
          />
        </div>
      </section>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="flex flex-col gap-3 rounded-xl border border-border/60 bg-surface-2/40 p-4 sm:flex-row"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Drink 3L water"
            className={`${inputClass} flex-1`}
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Adding…" : "Add"}
          </button>
        </form>
      )}

      <section>
        <h3 className="text-sm font-semibold text-white">Today&apos;s habits</h3>
        {habits.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No habits yet. Add one to get started.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {habits.map((h) => {
              const checked = todayCheckedIds.has(h.id);
              const streak = computeStreak(checkIns, h.id, today);
              return (
                <li
                  key={h.id}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface-2/40 p-3"
                >
                  <button
                    type="button"
                    onClick={() => void toggle(h.id)}
                    disabled={togglingId === h.id}
                    aria-label={checked ? "Uncheck" : "Check"}
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-50 ${
                      checked
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-transparent hover:border-accent"
                    }`}
                  >
                    {checked && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        checked ? "text-muted line-through" : "text-white"
                      }`}
                    >
                      {h.name}
                    </p>
                    {h.description && (
                      <p className="text-xs text-muted">{h.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                      🔥 {streak}d
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(h.id)}
                      disabled={deletingId === h.id}
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Delete habit"
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

      {habits.length > 0 && (
        <section className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Last 7 days</h3>
            <span className="text-xs text-muted">Habit grid</span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">
                    Habit
                  </th>
                  {weekDays.map((d) => (
                    <th
                      key={d.toISOString()}
                      className="px-1 py-2 text-center text-[10px] font-medium uppercase text-muted"
                    >
                      {d.toLocaleDateString(undefined, { weekday: "narrow" })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {habits.map((h) => (
                  <tr key={h.id}>
                    <td className="max-w-[180px] truncate px-2 py-1.5 text-xs text-white">
                      {h.name}
                    </td>
                    {weekDays.map((d) => {
                      const key = dayKey(d);
                      const did = checkInIndex.get(key)?.has(h.id) ?? false;
                      return (
                        <td key={key} className="px-1 py-1.5">
                          <div
                            className={`mx-auto h-5 w-5 rounded ${
                              did
                                ? "bg-accent"
                                : "border border-border bg-surface-2/60"
                            }`}
                            title={`${h.name} · ${d.toLocaleDateString()}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------------- ROUTINE ---------------- */

function RoutineTab({
  routines,
  today,
  onChange,
  onError,
}: {
  routines: DailyRoutine[];
  today: Date;
  onChange: () => Promise<Habit[]>;
  onError: (e: string | null) => void;
}) {
  const todayRoutine = useMemo(
    () => routines.find((r) => isSameDay(new Date(r.date), today)) ?? null,
    [routines, today]
  );

  const [wakeTime, setWakeTime] = useState(todayRoutine?.wakeTime ?? "");
  const [sleepTime, setSleepTime] = useState(todayRoutine?.sleepTime ?? "");
  const [rating, setRating] = useState(todayRoutine?.rating ?? 7);
  const [notes, setNotes] = useState(todayRoutine?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWakeTime(todayRoutine?.wakeTime ?? "");
    setSleepTime(todayRoutine?.sleepTime ?? "");
    setRating(todayRoutine?.rating ?? 7);
    setNotes(todayRoutine?.notes ?? "");
  }, [todayRoutine]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    onError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/discipline/routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wakeTime: wakeTime || undefined,
          sleepTime: sleepTime || undefined,
          rating,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save routine");
      }
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save routine");
    } finally {
      setSubmitting(false);
    }
  }

  const weekStats = useMemo(() => {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    const recent = routines.filter((r) => {
      const d = new Date(r.date);
      return d >= start && d <= today;
    });
    const wakeMinsList = recent
      .map((r) => parseTimeToMinutes(r.wakeTime))
      .filter((x): x is number => x !== null);
    const avgWake = wakeMinsList.length
      ? Math.round(wakeMinsList.reduce((s, n) => s + n, 0) / wakeMinsList.length)
      : null;
    const avgRating = recent.length
      ? recent.reduce((s, r) => s + r.rating, 0) / recent.length
      : null;
    return {
      avgWake,
      avgRating,
      logged: recent.length,
    };
  }, [routines, today]);

  const bestStreak = useMemo(() => {
    if (routines.length === 0) return 0;
    const sorted = [...routines].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let best = 0;
    let cur = 0;
    let prev: Date | null = null;
    for (const r of sorted) {
      const d = startOfDay(new Date(r.date));
      if (r.rating >= 7) {
        if (prev) {
          const diff = Math.round(
            (d.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)
          );
          cur = diff === 1 ? cur + 1 : 1;
        } else {
          cur = 1;
        }
        if (cur > best) best = cur;
      } else {
        cur = 0;
      }
      prev = d;
    }
    return best;
  }, [routines]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatPill
          label="Avg wake (7d)"
          value={minutesToTimeLabel(weekStats.avgWake)}
        />
        <StatPill
          label="Avg rating (7d)"
          value={weekStats.avgRating !== null ? weekStats.avgRating.toFixed(1) : "—"}
        />
        <StatPill label="Best good-day streak" value={`${bestStreak} days`} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-border/60 bg-surface-2/40 p-4"
      >
        <h3 className="text-sm font-semibold text-white">
          {todayRoutine ? "Update today's log" : "Log today"}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Wake up time">
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Sleep time">
            <input
              type="time"
              value={sleepTime}
              onChange={(e) => setSleepTime(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Rate your day
            </span>
            <span className="text-sm text-white">{rating}/10</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={rating}
            onChange={(e) => setRating(parseInt(e.target.value, 10))}
            className="mt-2 w-full accent-[#7F77DD]"
          />
        </div>
        <Field label="Notes">
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${inputClass} resize-none`}
            placeholder="What worked, what didn't…"
          />
        </Field>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : todayRoutine ? "Update log" : "Save log"}
        </button>
      </form>

      <section>
        <h3 className="text-sm font-semibold text-white">Recent days</h3>
        {routines.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No routine logged yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {routines.slice(0, 7).map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-border/60 bg-surface-2/40 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {new Date(r.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Wake {r.wakeTime ?? "—"} · Sleep {r.sleepTime ?? "—"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      r.rating >= 8
                        ? "bg-emerald-500/15 text-emerald-300"
                        : r.rating >= 5
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    {r.rating}/10
                  </span>
                </div>
                {r.notes && (
                  <p className="mt-2 text-xs text-muted">{r.notes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------------- PROGRESS ---------------- */

function ProgressTab({
  habits,
  checkIns,
  today,
  disciplineScore,
}: {
  habits: Habit[];
  checkIns: HabitCheckIn[];
  today: Date;
  disciplineScore: number;
}) {
  const monthly = useMemo(() => {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    const habitCount = habits.length || 1;
    const buckets: { label: string; date: Date; score: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = dayKey(d);
      let count = 0;
      for (const c of checkIns) {
        if (dayKey(new Date(c.date)) === key) count++;
      }
      buckets.push({
        label: d.toLocaleDateString(undefined, { day: "numeric" }),
        date: d,
        score: Math.round((count / habitCount) * 100),
      });
    }
    return buckets;
  }, [habits, checkIns, today]);

  const habitStats = useMemo(() => {
    return habits.map((h) => {
      const streak = computeStreak(checkIns, h.id, today);
      const monthHits = checkIns.filter((c) => {
        if (c.habitId !== h.id) return false;
        const d = new Date(c.date);
        return (
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear()
        );
      }).length;
      return { habit: h, streak, monthHits };
    });
  }, [habits, checkIns, today]);

  const bestHabits = useMemo(
    () => [...habitStats].sort((a, b) => b.streak - a.streak).slice(0, 3),
    [habitStats]
  );

  const needAttention = useMemo(
    () => habitStats.filter((s) => s.streak === 0).slice(0, 3),
    [habitStats]
  );

  const monthTotal = useMemo(
    () =>
      checkIns.filter((c) => {
        const d = new Date(c.date);
        return (
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear()
        );
      }).length,
    [checkIns, today]
  );

  const monthlyAvg = useMemo(() => {
    if (monthly.length === 0) return 0;
    return Math.round(monthly.reduce((s, m) => s + m.score, 0) / monthly.length);
  }, [monthly]);

  const motivational = useMemo(() => {
    if (disciplineScore >= 90) return "Locked in. Keep the streak alive. 🔥";
    if (disciplineScore >= 70) return "Strong day. Push one more habit tomorrow.";
    if (disciplineScore >= 50) return "Decent — small wins compound. Keep going.";
    if (disciplineScore > 0) return "Reset and rebuild — one habit at a time.";
    return "Fresh start today. Check off your first habit.";
  }, [disciplineScore]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-surface-2/40 to-indigo-500/10 p-5">
        <p className="text-xs uppercase tracking-wider text-violet-300">
          Today
        </p>
        <p className="mt-1 text-xl font-semibold text-white">{motivational}</p>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatPill label="30-day average" value={`${monthlyAvg}%`} />
        <StatPill label="This month total" value={`${monthTotal} check-ins`} />
        <StatPill label="Active habits" value={`${habits.length}`} />
      </div>

      <section className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Discipline last 30 days</h3>
          <span className="text-xs text-muted">% of habits hit</span>
        </div>
        <div className="mt-4 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1F2A52" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#9AA3C7"
                tick={{ fill: "#9AA3C7", fontSize: 10 }}
                axisLine={{ stroke: "#1F2A52" }}
                tickLine={false}
                interval={3}
              />
              <YAxis
                stroke="#9AA3C7"
                tick={{ fill: "#9AA3C7", fontSize: 12 }}
                axisLine={{ stroke: "#1F2A52" }}
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                cursor={{ fill: "rgba(127, 119, 221, 0.08)" }}
                contentStyle={{
                  background: "#0E1430",
                  border: "1px solid #1F2A52",
                  borderRadius: 8,
                  color: "#fff",
                }}
                formatter={(v) => `${v}%`}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} fill="#7F77DD" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
          <h3 className="text-sm font-semibold text-white">Best streaks</h3>
          {bestHabits.length === 0 || bestHabits[0].streak === 0 ? (
            <p className="mt-2 text-sm text-muted">No streaks yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {bestHabits.map(({ habit, streak }) => (
                <li
                  key={habit.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="truncate text-sm text-white">
                    {habit.name}
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
                    🔥 {streak}d
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
          <h3 className="text-sm font-semibold text-white">Needs attention</h3>
          {needAttention.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              All habits going strong today.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {needAttention.map(({ habit, monthHits }) => (
                <li
                  key={habit.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="truncate text-sm text-white">
                    {habit.name}
                  </span>
                  <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-300">
                    {monthHits}/mo
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
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
  tone,
}: {
  label: string;
  value: string;
  tone: "violet" | "emerald" | "sky" | "amber";
}) {
  const toneStyles: Record<typeof tone, string> = {
    violet: "text-violet-300",
    emerald: "text-emerald-300",
    sky: "text-sky-300",
    amber: "text-amber-300",
  };
  return (
    <div className="rounded-2xl border border-border/60 bg-surface/60 p-4 shadow-card sm:p-5">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneStyles[tone]}`}>{value}</p>
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
