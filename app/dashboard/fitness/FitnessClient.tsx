"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Exercise = {
  name: string;
  sets: number;
  reps: number;
  weight: number;
};

type Workout = {
  id: string;
  date: string;
  exercises: Exercise[];
  duration: number;
  notes: string | null;
};

type SleepLog = {
  id: string;
  date: string;
  hours: number;
  quality: number;
};

type WeightLog = {
  id: string;
  date: string;
  weight: number;
};

type CalorieLog = {
  id: string;
  date: string;
  calories: number;
  meal: string;
};

type TabKey = "workout" | "sleep" | "weight" | "calories";

const TABS: { key: TabKey; label: string }[] = [
  { key: "workout", label: "Workout" },
  { key: "sleep", label: "Sleep" },
  { key: "weight", label: "Weight" },
  { key: "calories", label: "Calories" },
];

const CALORIE_TARGET = 2000;

function todayInputValue() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfWeek(d: Date) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  out.setDate(out.getDate() + diff);
  return out;
}

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

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function FitnessClient() {
  const [tab, setTab] = useState<TabKey>("workout");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [calorieLogs, setCalorieLogs] = useState<CalorieLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goalWeight, setGoalWeight] = useState<string>("");

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [w, s, wt, c] = await Promise.all([
        fetch("/api/fitness/workouts", { cache: "no-store" }),
        fetch("/api/fitness/sleep", { cache: "no-store" }),
        fetch("/api/fitness/weight", { cache: "no-store" }),
        fetch("/api/fitness/calories", { cache: "no-store" }),
      ]);
      if (!w.ok) throw new Error("Failed to load workouts");
      if (!s.ok) throw new Error("Failed to load sleep");
      if (!wt.ok) throw new Error("Failed to load weight");
      if (!c.ok) throw new Error("Failed to load calories");
      const wJson = await w.json();
      const sJson = await s.json();
      const wtJson = await wt.json();
      const cJson = await c.json();
      setWorkouts(wJson.workouts ?? []);
      setSleepLogs(sJson.sleepLogs ?? []);
      setWeightLogs(wtJson.weightLogs ?? []);
      setCalorieLogs(cJson.calorieLogs ?? []);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("fitness:goalWeight");
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGoalWeight(saved);
    }
  }, []);

  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const today = useMemo(() => startOfDay(new Date()), []);

  const workoutsThisWeek = useMemo(
    () =>
      workouts.filter((w) => {
        const d = new Date(w.date);
        return d >= weekStart;
      }),
    [workouts, weekStart]
  );

  const workoutStreak = useMemo(() => {
    if (workouts.length === 0) return 0;
    const days = new Set<string>();
    for (const w of workouts) {
      const d = startOfDay(new Date(w.date));
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
  }, [workouts, today]);

  const last7DaysSleep = useMemo(() => {
    const out: { date: string; label: string; hours: number; quality: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const match = sleepLogs.find((s) => isSameDay(new Date(s.date), d));
      out.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        hours: match?.hours ?? 0,
        quality: match?.quality ?? 0,
      });
    }
    return out;
  }, [sleepLogs, today]);

  const avgSleep = useMemo(() => {
    const withData = last7DaysSleep.filter((d) => d.hours > 0);
    if (withData.length === 0) return 0;
    const total = withData.reduce((s, d) => s + d.hours, 0);
    return total / withData.length;
  }, [last7DaysSleep]);

  const sortedWeight = useMemo(
    () =>
      [...weightLogs].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [weightLogs]
  );

  const startingWeight = sortedWeight[0]?.weight;
  const currentWeight = sortedWeight[sortedWeight.length - 1]?.weight;
  const goalWeightNum = parseFloat(goalWeight);
  const hasGoal = Number.isFinite(goalWeightNum) && goalWeightNum > 0;

  const todayCalorieLogs = useMemo(
    () => calorieLogs.filter((c) => isSameDay(new Date(c.date), today)),
    [calorieLogs, today]
  );

  const todayCalories = useMemo(
    () => todayCalorieLogs.reduce((s, c) => s + c.calories, 0),
    [todayCalorieLogs]
  );

  return (
    <div className="mt-8 space-y-8">
      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Workouts this week"
          value={`${workoutsThisWeek.length}`}
          tone="rose"
        />
        <SummaryCard
          label="Avg sleep (7d)"
          value={avgSleep > 0 ? `${avgSleep.toFixed(1)}h` : "—"}
          tone="violet"
        />
        <SummaryCard
          label="Current weight"
          value={currentWeight ? `${currentWeight.toFixed(1)} kg` : "—"}
          tone="accent"
        />
        <SummaryCard
          label="Today's calories"
          value={`${todayCalories}`}
          tone="amber"
          suffix={` / ${CALORIE_TARGET}`}
        />
      </section>

      {/* Tabs */}
      <div className="rounded-2xl border border-border/60 bg-surface/60 shadow-card">
        <div className="flex overflow-x-auto border-b border-border/60">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "text-white"
                  : "text-muted hover:text-white"
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
              {tab === "workout" && (
                <WorkoutTab
                  workouts={workouts}
                  workoutStreak={workoutStreak}
                  workoutsThisWeek={workoutsThisWeek.length}
                  onChange={fetchAll}
                  onError={setError}
                />
              )}
              {tab === "sleep" && (
                <SleepTab
                  sleepLogs={sleepLogs}
                  last7Days={last7DaysSleep}
                  onChange={fetchAll}
                  onError={setError}
                />
              )}
              {tab === "weight" && (
                <WeightTab
                  weightLogs={sortedWeight}
                  goalWeight={goalWeight}
                  setGoalWeight={(v) => {
                    setGoalWeight(v);
                    if (typeof window !== "undefined") {
                      if (v) window.localStorage.setItem("fitness:goalWeight", v);
                      else window.localStorage.removeItem("fitness:goalWeight");
                    }
                  }}
                  startingWeight={startingWeight}
                  currentWeight={currentWeight}
                  goalWeightNum={hasGoal ? goalWeightNum : null}
                  onChange={fetchAll}
                  onError={setError}
                />
              )}
              {tab === "calories" && (
                <CaloriesTab
                  todayLogs={todayCalorieLogs}
                  todayTotal={todayCalories}
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

/* ---------------- WORKOUT TAB ---------------- */

function WorkoutTab({
  workouts,
  workoutStreak,
  workoutsThisWeek,
  onChange,
  onError,
}: {
  workouts: Workout[];
  workoutStreak: number;
  workoutsThisWeek: number;
  onChange: () => Promise<void>;
  onError: (e: string | null) => void;
}) {
  type ExerciseRow = { name: string; sets: string; reps: string; weight: string };
  const emptyRow: ExerciseRow = { name: "", sets: "", reps: "", weight: "" };

  const [exercises, setExercises] = useState<ExerciseRow[]>([{ ...emptyRow }]);
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayInputValue());
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function updateRow(i: number, patch: Partial<ExerciseRow>) {
    setExercises((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setExercises((prev) => [...prev, { ...emptyRow }]);
  }
  function removeRow(i: number) {
    setExercises((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    onError(null);

    const cleaned = exercises
      .map((r) => ({
        name: r.name.trim(),
        sets: parseInt(r.sets, 10),
        reps: parseInt(r.reps, 10),
        weight: parseFloat(r.weight || "0"),
      }))
      .filter((r) => r.name);

    if (cleaned.length === 0) {
      onError("Add at least one exercise with a name");
      return;
    }
    for (const r of cleaned) {
      if (!Number.isFinite(r.sets) || r.sets < 0) {
        onError("Sets must be a number");
        return;
      }
      if (!Number.isFinite(r.reps) || r.reps < 0) {
        onError("Reps must be a number");
        return;
      }
      if (!Number.isFinite(r.weight) || r.weight < 0) {
        onError("Weight must be a number");
        return;
      }
    }

    const durationNum = parseInt(duration, 10);
    if (!Number.isFinite(durationNum) || durationNum <= 0) {
      onError("Duration must be a positive number");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/fitness/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercises: cleaned,
          duration: durationNum,
          notes: notes.trim() || undefined,
          date,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to log workout");
      }
      setExercises([{ ...emptyRow }]);
      setDuration("");
      setNotes("");
      setDate(todayInputValue());
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to log workout");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    if (!window.confirm("Delete this workout?")) return;
    setDeletingId(id);
    onError(null);
    try {
      const res = await fetch(`/api/fitness/workouts?id=${encodeURIComponent(id)}`, {
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatPill label="This week" value={`${workoutsThisWeek} workouts`} />
        <StatPill label="Streak" value={`${workoutStreak} day${workoutStreak === 1 ? "" : "s"}`} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border/60 bg-surface-2/40 p-4">
        <h3 className="text-sm font-semibold text-white">Log workout</h3>

        <div className="space-y-3">
          {exercises.map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_repeat(3,1fr)_auto]">
              <input
                type="text"
                placeholder="Exercise (e.g. Bench press)"
                value={row.name}
                onChange={(e) => updateRow(i, { name: e.target.value })}
                className={inputClass}
              />
              <input
                type="number"
                min="0"
                placeholder="Sets"
                value={row.sets}
                onChange={(e) => updateRow(i, { sets: e.target.value })}
                className={inputClass}
              />
              <input
                type="number"
                min="0"
                placeholder="Reps"
                value={row.reps}
                onChange={(e) => updateRow(i, { reps: e.target.value })}
                className={inputClass}
              />
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="kg"
                value={row.weight}
                onChange={(e) => updateRow(i, { weight: e.target.value })}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={exercises.length === 1}
                className="col-span-2 rounded-lg border border-border px-3 py-2 text-xs text-muted transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-1"
                aria-label="Remove exercise"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted transition-colors hover:bg-white/5 hover:text-white"
          >
            + Add exercise
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Duration (minutes)">
            <input
              type="number"
              min="1"
              required
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={inputClass}
              placeholder="e.g. 45"
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Notes (optional)">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
            placeholder="Felt strong, hit a PR…"
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save workout"}
        </button>
      </form>

      <section>
        <h3 className="text-sm font-semibold text-white">Recent workouts</h3>
        {workouts.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No workouts yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {workouts.slice(0, 10).map((w) => (
              <li
                key={w.id}
                className="rounded-xl border border-border/60 bg-surface-2/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {new Date(w.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-muted">{w.duration} min</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(w.id)}
                    disabled={deletingId === w.id}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Delete workout"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <ul className="mt-2 space-y-1">
                  {(w.exercises ?? []).map((ex, idx) => (
                    <li key={idx} className="text-sm text-muted">
                      <span className="text-white">{ex.name}</span>
                      {" — "}
                      {ex.sets} × {ex.reps}
                      {ex.weight > 0 ? ` @ ${ex.weight} kg` : ""}
                    </li>
                  ))}
                </ul>
                {w.notes && (
                  <p className="mt-2 text-xs italic text-muted">{w.notes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------------- SLEEP TAB ---------------- */

function SleepTab({
  sleepLogs,
  last7Days,
  onChange,
  onError,
}: {
  sleepLogs: SleepLog[];
  last7Days: { date: string; label: string; hours: number; quality: number }[];
  onChange: () => Promise<void>;
  onError: (e: string | null) => void;
}) {
  const [hours, setHours] = useState("");
  const [quality, setQuality] = useState(3);
  const [date, setDate] = useState(todayInputValue());
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    onError(null);
    const hoursNum = parseFloat(hours);
    if (!Number.isFinite(hoursNum) || hoursNum < 1 || hoursNum > 12) {
      onError("Hours must be between 1 and 12");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/fitness/sleep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: hoursNum, quality, date }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to log sleep");
      }
      setHours("");
      setQuality(3);
      setDate(todayInputValue());
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to log sleep");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    if (!window.confirm("Delete this sleep log?")) return;
    setDeletingId(id);
    onError(null);
    try {
      const res = await fetch(`/api/fitness/sleep?id=${encodeURIComponent(id)}`, {
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
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border/60 bg-surface-2/40 p-4">
        <h3 className="text-sm font-semibold text-white">Log sleep</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Hours (1-12)">
            <input
              type="number"
              step="0.1"
              min="1"
              max="12"
              required
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className={inputClass}
              placeholder="e.g. 7.5"
            />
          </Field>
          <Field label="Quality">
            <StarPicker value={quality} onChange={setQuality} />
          </Field>
          <Field label="Date">
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save sleep"}
        </button>
      </form>

      <section className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Last 7 days</h3>
          <span className="text-xs text-muted">Hours per night</span>
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
                domain={[0, 12]}
              />
              <Tooltip
                cursor={{ fill: "rgba(127, 119, 221, 0.08)" }}
                contentStyle={{
                  background: "#0E1430",
                  border: "1px solid #1F2A52",
                  borderRadius: 8,
                  color: "#fff",
                }}
                formatter={(v) => `${v} h`}
              />
              <Bar dataKey="hours" radius={[6, 6, 0, 0]} fill="#7F77DD" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-white">Recent sleep logs</h3>
        {sleepLogs.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No sleep logs yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/60">
            {sleepLogs.slice(0, 10).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm text-white">{formatShortDate(s.date)}</p>
                  <p className="text-xs text-muted">
                    {s.hours} h · {"★".repeat(s.quality)}{"☆".repeat(5 - s.quality)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Delete sleep log"
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

/* ---------------- WEIGHT TAB ---------------- */

function WeightTab({
  weightLogs,
  goalWeight,
  setGoalWeight,
  startingWeight,
  currentWeight,
  goalWeightNum,
  onChange,
  onError,
}: {
  weightLogs: WeightLog[];
  goalWeight: string;
  setGoalWeight: (v: string) => void;
  startingWeight: number | undefined;
  currentWeight: number | undefined;
  goalWeightNum: number | null;
  onChange: () => Promise<void>;
  onError: (e: string | null) => void;
}) {
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(todayInputValue());
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const chartData = useMemo(
    () =>
      weightLogs.map((w) => ({
        label: formatShortDate(w.date),
        weight: w.weight,
      })),
    [weightLogs]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    onError(null);
    const weightNum = parseFloat(weight);
    if (!Number.isFinite(weightNum) || weightNum <= 0) {
      onError("Weight must be positive");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/fitness/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: weightNum, date }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to log weight");
      }
      setWeight("");
      setDate(todayInputValue());
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to log weight");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    if (!window.confirm("Delete this weight log?")) return;
    setDeletingId(id);
    onError(null);
    try {
      const res = await fetch(`/api/fitness/weight?id=${encodeURIComponent(id)}`, {
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatPill
          label="Starting"
          value={startingWeight ? `${startingWeight.toFixed(1)} kg` : "—"}
        />
        <StatPill
          label="Current"
          value={currentWeight ? `${currentWeight.toFixed(1)} kg` : "—"}
        />
        <StatPill
          label="Goal"
          value={goalWeightNum ? `${goalWeightNum.toFixed(1)} kg` : "—"}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border/60 bg-surface-2/40 p-4">
        <h3 className="text-sm font-semibold text-white">Log weight</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Weight (kg)">
            <input
              type="number"
              step="0.1"
              min="0"
              required
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className={inputClass}
              placeholder="e.g. 72.5"
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Goal weight (kg)">
            <input
              type="number"
              step="0.1"
              min="0"
              value={goalWeight}
              onChange={(e) => setGoalWeight(e.target.value)}
              className={inputClass}
              placeholder="e.g. 68"
            />
          </Field>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save weight"}
        </button>
      </form>

      <section className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Progress</h3>
          <span className="text-xs text-muted">kg over time</span>
        </div>
        <div className="mt-4 h-64 w-full">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Log a weight to see progress.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
                  domain={["dataMin - 2", "dataMax + 2"]}
                />
                <Tooltip
                  cursor={{ stroke: "rgba(127, 119, 221, 0.25)" }}
                  contentStyle={{
                    background: "#0E1430",
                    border: "1px solid #1F2A52",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                  formatter={(v) => `${v} kg`}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#7F77DD"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#7F77DD" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-white">Recent weight logs</h3>
        {weightLogs.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No weight logs yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/60">
            {[...weightLogs].reverse().slice(0, 10).map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm text-white">{formatShortDate(w.date)}</p>
                  <p className="text-xs text-muted">{w.weight.toFixed(1)} kg</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(w.id)}
                  disabled={deletingId === w.id}
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Delete weight log"
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

/* ---------------- CALORIES TAB ---------------- */

function CaloriesTab({
  todayLogs,
  todayTotal,
  onChange,
  onError,
}: {
  todayLogs: CalorieLog[];
  todayTotal: number;
  onChange: () => Promise<void>;
  onError: (e: string | null) => void;
}) {
  const [meal, setMeal] = useState("");
  const [calories, setCalories] = useState("");
  const [date, setDate] = useState(todayInputValue());
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const pct = Math.min(100, Math.round((todayTotal / CALORIE_TARGET) * 100));
  const over = todayTotal > CALORIE_TARGET;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    onError(null);
    if (!meal.trim()) {
      onError("Meal name is required");
      return;
    }
    const calNum = parseInt(calories, 10);
    if (!Number.isFinite(calNum) || calNum <= 0) {
      onError("Calories must be a positive number");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/fitness/calories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal: meal.trim(), calories: calNum, date }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to log meal");
      }
      setMeal("");
      setCalories("");
      setDate(todayInputValue());
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to log meal");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    if (!window.confirm("Delete this meal?")) return;
    setDeletingId(id);
    onError(null);
    try {
      const res = await fetch(`/api/fitness/calories?id=${encodeURIComponent(id)}`, {
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
      <section className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-white">Today</span>
          <span className={over ? "text-rose-300" : "text-muted"}>
            {todayTotal} / {CALORIE_TARGET} kcal
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: over ? "#fb7185" : "#7F77DD",
            }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          {over
            ? `${todayTotal - CALORIE_TARGET} kcal over target`
            : `${CALORIE_TARGET - todayTotal} kcal remaining`}
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border/60 bg-surface-2/40 p-4">
        <h3 className="text-sm font-semibold text-white">Log meal</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Meal">
            <input
              type="text"
              required
              value={meal}
              onChange={(e) => setMeal(e.target.value)}
              className={inputClass}
              placeholder="e.g. Chicken salad"
            />
          </Field>
          <Field label="Calories">
            <input
              type="number"
              min="1"
              required
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className={inputClass}
              placeholder="e.g. 450"
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Add meal"}
        </button>
      </form>

      <section>
        <h3 className="text-sm font-semibold text-white">Today&apos;s meals</h3>
        {todayLogs.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No meals logged today.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/60">
            {todayLogs.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{c.meal}</p>
                  <p className="text-xs text-muted">
                    {new Date(c.date).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">
                    {c.calories} kcal
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Delete meal"
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
  tone,
  suffix,
}: {
  label: string;
  value: string;
  tone: "rose" | "violet" | "accent" | "amber";
  suffix?: string;
}) {
  const toneStyles: Record<typeof tone, string> = {
    rose: "text-rose-300",
    violet: "text-violet-300",
    accent: "text-accent",
    amber: "text-amber-300",
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

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={`text-2xl leading-none transition-colors ${
            n <= value ? "text-amber-300" : "text-muted/40 hover:text-muted"
          }`}
        >
          ★
        </button>
      ))}
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
