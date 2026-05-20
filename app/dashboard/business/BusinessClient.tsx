"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  targetDate: string | null;
  status: string;
  progress: number;
  createdAt: string;
};

type Idea = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  notes: string | null;
  createdAt: string;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
};

type Investment = {
  id: string;
  name: string;
  type: string;
  amount: number;
  currentValue: number | null;
  date: string;
  notes: string | null;
};

type TabKey = "goals" | "ideas" | "tasks" | "investments";

const TABS: { key: TabKey; label: string }[] = [
  { key: "goals", label: "Goals" },
  { key: "ideas", label: "Ideas" },
  { key: "tasks", label: "Tasks" },
  { key: "investments", label: "Investments" },
];

const GOAL_CATEGORIES = ["Career", "Financial", "Personal", "Business", "Health"] as const;
const GOAL_STATUSES = ["active", "completed", "paused"] as const;
const IDEA_CATEGORIES = ["Natural Products", "Tech/AI", "Investment", "Other"] as const;
const IDEA_STATUSES = ["Idea", "Researching", "Planning", "In Progress", "Launched"] as const;
const TASK_CATEGORIES = ["Work(Accenture)", "Business", "Personal", "Investment"] as const;
const TASK_PRIORITIES = ["High", "Medium", "Low"] as const;
const INVESTMENT_TYPES = [
  "Stocks",
  "Mutual Funds",
  "Gold",
  "FD",
  "Crypto",
  "Real Estate",
  "Other",
] as const;

const PIE_COLORS = [
  "#7F77DD",
  "#34D399",
  "#F59E0B",
  "#60A5FA",
  "#F472B6",
  "#A78BFA",
  "#FB7185",
];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BusinessClient() {
  const [tab, setTab] = useState<TabKey>("goals");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [g, i, t, inv] = await Promise.all([
        fetch("/api/business/goals", { cache: "no-store" }),
        fetch("/api/business/ideas", { cache: "no-store" }),
        fetch("/api/business/tasks", { cache: "no-store" }),
        fetch("/api/business/investments", { cache: "no-store" }),
      ]);
      if (!g.ok) throw new Error("Failed to load goals");
      if (!i.ok) throw new Error("Failed to load ideas");
      if (!t.ok) throw new Error("Failed to load tasks");
      if (!inv.ok) throw new Error("Failed to load investments");
      const gJ = await g.json();
      const iJ = await i.json();
      const tJ = await t.json();
      const invJ = await inv.json();
      setGoals(gJ.goals ?? []);
      setIdeas(iJ.ideas ?? []);
      setTasks(tJ.tasks ?? []);
      setInvestments(invJ.investments ?? []);
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

  const activeGoals = useMemo(
    () => goals.filter((g) => g.status === "active").length,
    [goals]
  );

  const todayTasks = useMemo(() => {
    const today = startOfDay(new Date());
    return tasks.filter((t) => {
      if (t.status === "completed") return false;
      if (!t.dueDate) return false;
      return isSameDay(new Date(t.dueDate), today);
    }).length;
  }, [tasks]);

  const portfolioTotal = useMemo(
    () =>
      investments.reduce(
        (s, inv) => s + (inv.currentValue ?? inv.amount),
        0
      ),
    [investments]
  );

  const launchedIdeas = useMemo(
    () => ideas.filter((i) => i.status === "Launched" || i.status === "In Progress").length,
    [ideas]
  );

  return (
    <div className="mt-8 space-y-8">
      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Active goals" value={`${activeGoals}`} tone="violet" />
        <SummaryCard label="Ideas in progress" value={`${launchedIdeas}`} tone="amber" />
        <SummaryCard label="Tasks due today" value={`${todayTasks}`} tone="sky" />
        <SummaryCard label="Portfolio value" value={formatINR(portfolioTotal)} tone="emerald" />
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
              {tab === "goals" && (
                <GoalsTab goals={goals} onChange={fetchAll} onError={setError} />
              )}
              {tab === "ideas" && (
                <IdeasTab ideas={ideas} onChange={fetchAll} onError={setError} />
              )}
              {tab === "tasks" && (
                <TasksTab tasks={tasks} onChange={fetchAll} onError={setError} />
              )}
              {tab === "investments" && (
                <InvestmentsTab
                  investments={investments}
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

/* ---------------- GOALS ---------------- */

function GoalsTab({
  goals,
  onChange,
  onError,
}: {
  goals: Goal[];
  onChange: () => Promise<void>;
  onError: (e: string | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof GOAL_CATEGORIES)[number]>("Business");
  const [targetDate, setTargetDate] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"All" | (typeof GOAL_CATEGORIES)[number]>("All");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === "All" ? goals : goals.filter((g) => g.category === filter)),
    [goals, filter]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    onError(null);
    if (!title.trim()) {
      onError("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/business/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          description: description || undefined,
          targetDate: targetDate || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add goal");
      }
      setTitle("");
      setDescription("");
      setTargetDate("");
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to add goal");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateGoal(id: string, patch: Partial<{ progress: number; status: string }>) {
    if (updatingId) return;
    setUpdatingId(id);
    onError(null);
    try {
      const res = await fetch("/api/business/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update");
      }
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    if (!window.confirm("Delete this goal?")) return;
    setDeletingId(id);
    onError(null);
    try {
      const res = await fetch(`/api/business/goals?id=${encodeURIComponent(id)}`, {
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
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-border/60 bg-surface-2/40 p-4"
      >
        <h3 className="text-sm font-semibold text-white">Add a goal</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Title">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="e.g. Launch oil business"
              required
            />
          </Field>
          <Field label="Category">
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as (typeof GOAL_CATEGORIES)[number])
              }
              className={inputClass}
            >
              {GOAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Target date">
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Description">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              placeholder="Optional"
            />
          </Field>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Adding…" : "Add goal"}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {(["All", ...GOAL_CATEGORIES] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === c
                ? "border-accent bg-accent-soft text-white"
                : "border-border bg-surface-2/40 text-muted hover:text-white"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <section>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted">No goals yet — add one above.</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((g) => (
              <li
                key={g.id}
                className="rounded-xl border border-border/60 bg-surface-2/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white">{g.title}</p>
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent">
                        {g.category}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                          g.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : g.status === "paused"
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-blue-500/15 text-blue-300"
                        }`}
                      >
                        {g.status}
                      </span>
                    </div>
                    {g.description && (
                      <p className="mt-1 text-xs text-muted">{g.description}</p>
                    )}
                    <p className="mt-1 text-xs text-muted">
                      Target: {formatShortDate(g.targetDate)}
                    </p>

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted">Progress</span>
                        <span className="font-medium text-white">{g.progress}%</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all"
                          style={{ width: `${g.progress}%` }}
                        />
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={g.progress}
                        disabled={updatingId === g.id}
                        onChange={(e) =>
                          void updateGoal(g.id, { progress: parseInt(e.target.value, 10) })
                        }
                        className="mt-2 w-full accent-[#7F77DD]"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <select
                      value={g.status}
                      disabled={updatingId === g.id}
                      onChange={(e) => void updateGoal(g.id, { status: e.target.value })}
                      className="rounded-lg border border-border bg-surface-2/60 px-2 py-1 text-xs text-white outline-none"
                    >
                      {GOAL_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDelete(g.id)}
                      disabled={deletingId === g.id}
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Delete goal"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------------- IDEAS ---------------- */

function IdeasTab({
  ideas,
  onChange,
  onError,
}: {
  ideas: Idea[];
  onChange: () => Promise<void>;
  onError: (e: string | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof IDEA_CATEGORIES)[number]>(
    "Natural Products"
  );
  const [status, setStatus] = useState<(typeof IDEA_STATUSES)[number]>("Idea");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    onError(null);
    if (!title.trim()) {
      onError("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/business/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          status,
          description: description || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add idea");
      }
      setTitle("");
      setDescription("");
      setStatus("Idea");
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to add idea");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditNotes(idea: Idea) {
    setExpandedId(idea.id);
    setNotesDraft(idea.notes ?? "");
  }

  async function saveNotes(id: string) {
    if (updatingId) return;
    setUpdatingId(id);
    onError(null);
    try {
      const res = await fetch("/api/business/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes: notesDraft }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      setExpandedId(null);
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    if (updatingId) return;
    setUpdatingId(id);
    onError(null);
    try {
      const res = await fetch("/api/business/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update");
      }
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    if (!window.confirm("Delete this idea?")) return;
    setDeletingId(id);
    onError(null);
    try {
      const res = await fetch(`/api/business/ideas?id=${encodeURIComponent(id)}`, {
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
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 px-5 py-4">
        <p className="text-xs uppercase tracking-wider text-amber-300">
          Build in public
        </p>
        <p className="mt-1 text-sm text-white">
          Track your natural oil business and AI website business here — and any
          other ideas that come up.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-border/60 bg-surface-2/40 p-4"
      >
        <h3 className="text-sm font-semibold text-white">New idea</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Title">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="e.g. Cold-pressed coconut oil DTC"
              required
            />
          </Field>
          <Field label="Category">
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as (typeof IDEA_CATEGORIES)[number])
              }
              className={inputClass}
            >
              {IDEA_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as (typeof IDEA_STATUSES)[number])
              }
              className={inputClass}
            >
              {IDEA_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              placeholder="The one-liner"
            />
          </Field>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save idea"}
        </button>
      </form>

      <section>
        <h3 className="text-sm font-semibold text-white">Your ideas</h3>
        {ideas.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No ideas yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {ideas.map((idea) => {
              const expanded = expandedId === idea.id;
              return (
                <li
                  key={idea.id}
                  className="rounded-xl border border-border/60 bg-surface-2/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{idea.title}</p>
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent">
                          {idea.category}
                        </span>
                      </div>
                      {idea.description && (
                        <p className="mt-1 text-sm text-muted">{idea.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <select
                        value={idea.status}
                        disabled={updatingId === idea.id}
                        onChange={(e) => void updateStatus(idea.id, e.target.value)}
                        className="rounded-lg border border-border bg-surface-2/60 px-2 py-1 text-xs text-white outline-none"
                      >
                        {IDEA_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDelete(idea.id)}
                        disabled={deletingId === idea.id}
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Delete idea"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    {expanded ? (
                      <div className="space-y-2">
                        <textarea
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          rows={4}
                          className={`${inputClass} resize-none`}
                          placeholder="Research, learnings, next steps…"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void saveNotes(idea.id)}
                            disabled={updatingId === idea.id}
                            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
                          >
                            {updatingId === idea.id ? "Saving…" : "Save notes"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedId(null)}
                            className="rounded-lg border border-border bg-surface-2/40 px-3 py-1.5 text-xs text-muted transition-colors hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {idea.notes ? (
                          <p className="whitespace-pre-wrap text-xs text-muted">
                            {idea.notes}
                          </p>
                        ) : (
                          <p className="text-xs italic text-muted/70">No notes yet.</p>
                        )}
                        <button
                          type="button"
                          onClick={() => startEditNotes(idea)}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          {idea.notes ? "Edit notes" : "Add notes"}
                        </button>
                      </div>
                    )}
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

/* ---------------- TASKS ---------------- */

function TasksTab({
  tasks,
  onChange,
  onError,
}: {
  tasks: Task[];
  onChange: () => Promise<void>;
  onError: (e: string | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof TASK_CATEGORIES)[number]>("Business");
  const [priority, setPriority] = useState<(typeof TASK_PRIORITIES)[number]>("Medium");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<"All" | (typeof TASK_CATEGORIES)[number]>(
    "All"
  );
  const [priorityFilter, setPriorityFilter] = useState<"All" | (typeof TASK_PRIORITIES)[number]>(
    "All"
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);

  const todayTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (!t.dueDate) return false;
        return isSameDay(new Date(t.dueDate), today);
      }),
    [tasks, today]
  );

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (categoryFilter !== "All" && t.category !== categoryFilter) return false;
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, categoryFilter, priorityFilter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    onError(null);
    if (!title.trim()) {
      onError("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/business/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          priority,
          description: description || undefined,
          dueDate: dueDate || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add task");
      }
      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("Medium");
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to add task");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggle(t: Task) {
    if (updatingId) return;
    setUpdatingId(t.id);
    onError(null);
    try {
      const res = await fetch("/api/business/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: t.id,
          status: t.status === "completed" ? "pending" : "completed",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update");
      }
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    if (!window.confirm("Delete this task?")) return;
    setDeletingId(id);
    onError(null);
    try {
      const res = await fetch(`/api/business/tasks?id=${encodeURIComponent(id)}`, {
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
      {todayTasks.length > 0 && (
        <section className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-surface-2/40 to-indigo-500/10 p-5">
          <h3 className="text-sm font-semibold text-white">Due today</h3>
          <ul className="mt-3 space-y-2">
            {todayTasks.map((t) => (
              <TaskRow
                key={`today-${t.id}`}
                task={t}
                onToggle={() => void toggle(t)}
                onDelete={() => void handleDelete(t.id)}
                disabled={updatingId === t.id || deletingId === t.id}
              />
            ))}
          </ul>
        </section>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-border/60 bg-surface-2/40 p-4"
      >
        <h3 className="text-sm font-semibold text-white">New task</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Title">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="e.g. Finalize landing page copy"
              required
            />
          </Field>
          <Field label="Category">
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as (typeof TASK_CATEGORIES)[number])
              }
              className={inputClass}
            >
              {TASK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as (typeof TASK_PRIORITIES)[number])
              }
              className={inputClass}
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due date">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Description">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} sm:col-span-2`}
              placeholder="Optional details"
            />
          </Field>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Adding…" : "Add task"}
        </button>
      </form>

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {(["All", ...TASK_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter(c)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                categoryFilter === c
                  ? "border-accent bg-accent-soft text-white"
                  : "border-border bg-surface-2/40 text-muted hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(["All", ...TASK_PRIORITIES] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriorityFilter(p)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                priorityFilter === p
                  ? "border-accent bg-accent-soft text-white"
                  : "border-border bg-surface-2/40 text-muted hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <section>
        <h3 className="text-sm font-semibold text-white">All tasks</h3>
        {filtered.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No tasks match these filters.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {filtered.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onToggle={() => void toggle(t)}
                onDelete={() => void handleDelete(t.id)}
                disabled={updatingId === t.id || deletingId === t.id}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  disabled,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const priorityColor =
    task.priority === "High"
      ? "bg-rose-500/15 text-rose-300"
      : task.priority === "Medium"
        ? "bg-amber-500/15 text-amber-300"
        : "bg-emerald-500/15 text-emerald-300";
  const completed = task.status === "completed";

  return (
    <li className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface-2/40 p-3">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={completed ? "Mark pending" : "Mark complete"}
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-50 ${
          completed
            ? "border-accent bg-accent text-white"
            : "border-border bg-transparent hover:border-accent"
        }`}
      >
        {completed && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`text-sm font-medium ${
              completed ? "text-muted line-through" : "text-white"
            }`}
          >
            {task.title}
          </p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${priorityColor}`}>
            {task.priority}
          </span>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent">
            {task.category}
          </span>
        </div>
        {task.description && (
          <p className="mt-1 text-xs text-muted">{task.description}</p>
        )}
        {task.dueDate && (
          <p className="mt-1 text-[11px] text-muted">
            Due {formatShortDate(task.dueDate)}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Delete task"
        title="Delete"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </li>
  );
}

/* ---------------- INVESTMENTS ---------------- */

function InvestmentsTab({
  investments,
  onChange,
  onError,
}: {
  investments: Investment[];
  onChange: () => Promise<void>;
  onError: (e: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof INVESTMENT_TYPES)[number]>("Stocks");
  const [amount, setAmount] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [date, setDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totals = useMemo(() => {
    let invested = 0;
    let current = 0;
    for (const inv of investments) {
      invested += inv.amount;
      current += inv.currentValue ?? inv.amount;
    }
    return { invested, current, gain: current - invested };
  }, [investments]);

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of investments) {
      const value = inv.currentValue ?? inv.amount;
      map.set(inv.type, (map.get(inv.type) ?? 0) + value);
    }
    return Array.from(map.entries()).map(([type, value]) => ({ name: type, value }));
  }, [investments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    onError(null);
    const amt = Number(amount);
    if (!name.trim()) {
      onError("Name is required");
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      onError("Amount must be positive");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/business/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          amount: amt,
          currentValue: currentValue ? Number(currentValue) : undefined,
          date: date || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add investment");
      }
      setName("");
      setAmount("");
      setCurrentValue("");
      setDate("");
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to add investment");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    if (!window.confirm("Delete this investment?")) return;
    setDeletingId(id);
    onError(null);
    try {
      const res = await fetch(`/api/business/investments?id=${encodeURIComponent(id)}`, {
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
        <StatPill label="Total invested" value={formatINR(totals.invested)} />
        <StatPill label="Current value" value={formatINR(totals.current)} />
        <StatPill
          label="Gain / Loss"
          value={`${totals.gain >= 0 ? "+" : "−"}${formatINR(Math.abs(totals.gain))}`}
          tone={totals.gain >= 0 ? "emerald" : "rose"}
        />
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-border/60 bg-surface-2/40 p-4"
      >
        <h3 className="text-sm font-semibold text-white">Log investment</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Nifty 50 Index"
              required
            />
          </Field>
          <Field label="Type">
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as (typeof INVESTMENT_TYPES)[number])
              }
              className={inputClass}
            >
              {INVESTMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount invested (₹)">
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
              placeholder="50000"
              required
            />
          </Field>
          <Field label="Current value (₹)">
            <input
              type="number"
              min="0"
              step="1"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              className={inputClass}
              placeholder="Optional"
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
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
          {submitting ? "Saving…" : "Add investment"}
        </button>
      </form>

      {byType.length > 0 && (
        <section className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Portfolio breakdown</h3>
            <span className="text-xs text-muted">By type</span>
          </div>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byType}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={2}
                >
                  {byType.map((entry, idx) => (
                    <Cell
                      key={entry.name}
                      fill={PIE_COLORS[idx % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0E1430",
                    border: "1px solid #1F2A52",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                  formatter={(v) => formatINR(Number(v))}
                />
                <Legend
                  wrapperStyle={{ color: "#9AA3C7", fontSize: 12 }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold text-white">Holdings</h3>
        {investments.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No investments logged yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {investments.map((inv) => {
              const current = inv.currentValue ?? inv.amount;
              const gain = current - inv.amount;
              const pct = inv.amount > 0 ? (gain / inv.amount) * 100 : 0;
              return (
                <li
                  key={inv.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-surface-2/40 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white">{inv.name}</p>
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent">
                        {inv.type}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Invested {formatINR(inv.amount)} · {formatShortDate(inv.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                      {formatINR(current)}
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        gain >= 0 ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {gain >= 0 ? "+" : "−"}
                      {formatINR(Math.abs(gain))} ({pct.toFixed(1)}%)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(inv.id)}
                    disabled={deletingId === inv.id}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Delete investment"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
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
}: {
  label: string;
  value: string;
  tone: "violet" | "amber" | "sky" | "emerald";
}) {
  const toneStyles: Record<typeof tone, string> = {
    violet: "text-violet-300",
    amber: "text-amber-300",
    sky: "text-sky-300",
    emerald: "text-emerald-300",
  };
  return (
    <div className="rounded-2xl border border-border/60 bg-surface/60 p-4 shadow-card sm:p-5">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneStyles[tone]}`}>{value}</p>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "rose";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "rose"
        ? "text-rose-300"
        : "text-white";
  return (
    <div className="rounded-xl border border-border/60 bg-surface-2/40 px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
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
