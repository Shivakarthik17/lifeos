"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/* ---------------- types ---------------- */

type Meeting = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  date: string;
  startTime: string;
  endTime: string | null;
  reminderMin: number;
  category: string;
  color: string;
  createdAt: string;
};

type Todo = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  category: string;
  dueDate: string | null;
  dueTime: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
};

type TodoFilter = "all" | "today" | "upcoming" | "completed";

/* ---------------- constants ---------------- */

const CATEGORIES = [
  { key: "work", label: "Work", color: "#7F77DD" },
  { key: "personal", label: "Personal", color: "#2DD4BF" },
  { key: "health", label: "Health", color: "#34D399" },
  { key: "family", label: "Family", color: "#F472B6" },
  { key: "other", label: "Other", color: "#9AA3C7" },
] as const;

const CATEGORY_MAP: Record<string, { label: string; color: string }> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, { label: c.label, color: c.color }])
);

const REMINDER_OPTIONS = [
  { value: 15, label: "15 min before" },
  { value: 30, label: "30 min before" },
  { value: 60, label: "1 hour before" },
  { value: 120, label: "2 hours before" },
];

const PRIORITIES = [
  { key: "high", label: "High", color: "#F43F5E", badge: "bg-rose-500/15 text-rose-300" },
  { key: "medium", label: "Medium", color: "#F59E0B", badge: "bg-amber-500/15 text-amber-300" },
  { key: "low", label: "Low", color: "#10B981", badge: "bg-emerald-500/15 text-emerald-300" },
] as const;

const PRIORITY_MAP: Record<string, (typeof PRIORITIES)[number]> = Object.fromEntries(
  PRIORITIES.map((p) => [p.key, p])
);

function priorityInfo(key: string) {
  return PRIORITY_MAP[key] ?? PRIORITY_MAP.medium;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/* ---------------- date helpers ---------------- */

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

/** Local YYYY-MM-DD key (avoids UTC shifting the calendar day). */
function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(from: Date, to: Date) {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function formatTime(time: string | null) {
  if (!time) return "";
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time;
  const h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${min} ${ampm}`;
}

function relativeDayLabel(target: Date, today: Date) {
  const diff = daysBetween(today, target);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return `${Math.abs(diff)} day${diff === -1 ? "" : "s"} ago`;
  return `In ${diff} days`;
}

/* ---------------- main component ---------------- */

export default function PlannerClient() {
  const today = useMemo(() => startOfDay(new Date()), []);

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMonth, setViewMonth] = useState(() => today.getMonth());
  const [viewYear, setViewYear] = useState(() => today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  // Modal state for the meeting form (add when meeting is null, edit otherwise).
  const [meetingModal, setMeetingModal] = useState<{ open: boolean; meeting: Meeting | null }>({
    open: false,
    meeting: null,
  });
  // Modal state for editing a todo.
  const [todoModal, setTodoModal] = useState<Todo | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [m, t] = await Promise.all([
        fetch("/api/planner/meetings", { cache: "no-store" }),
        fetch("/api/planner/todos", { cache: "no-store" }),
      ]);
      if (!m.ok) throw new Error("Failed to load meetings");
      if (!t.ok) throw new Error("Failed to load todos");
      const mJ = await m.json();
      const tJ = await t.json();
      setMeetings(mJ.meetings ?? []);
      setTodos(tJ.todos ?? []);
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

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const mtg of meetings) {
      const key = dayKey(new Date(mtg.date));
      const list = map.get(key);
      if (list) list.push(mtg);
      else map.set(key, [mtg]);
    }
    return map;
  }, [meetings]);

  const selectedMeetings = useMemo(() => {
    const list = meetingsByDay.get(dayKey(selectedDay)) ?? [];
    return [...list].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [meetingsByDay, selectedDay]);

  const upcomingMeetings = useMemo(() => {
    const cutoff = startOfDay(new Date());
    const end = new Date(cutoff);
    end.setDate(end.getDate() + 7);
    return meetings
      .filter((mtg) => {
        const d = startOfDay(new Date(mtg.date));
        return d >= cutoff && d <= end;
      })
      .sort((a, b) => {
        const dd = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dd !== 0) return dd;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [meetings]);

  const pendingTodoCount = useMemo(
    () => todos.filter((t) => !t.completed).length,
    [todos]
  );

  function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  async function deleteMeeting(id: string) {
    setError(null);
    const res = await fetch(`/api/planner/meetings?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to delete");
    }
    await fetchAll();
  }

  return (
    <div className="mt-8 space-y-8">
      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {/* LEFT: calendar + schedule */}
          <div className="space-y-8 lg:col-span-2">
            <CalendarView
              viewMonth={viewMonth}
              viewYear={viewYear}
              today={today}
              selectedDay={selectedDay}
              meetingsByDay={meetingsByDay}
              onPrev={() => changeMonth(-1)}
              onNext={() => changeMonth(1)}
              onToday={() => {
                setViewMonth(today.getMonth());
                setViewYear(today.getFullYear());
                setSelectedDay(today);
              }}
              onSelect={setSelectedDay}
            />

            <DaySchedule
              selectedDay={selectedDay}
              today={today}
              meetings={selectedMeetings}
              onAdd={() => setMeetingModal({ open: true, meeting: null })}
              onEdit={(m) => setMeetingModal({ open: true, meeting: m })}
              onDelete={deleteMeeting}
              onError={setError}
            />
          </div>

          {/* RIGHT: todos + reminders */}
          <div className="space-y-8">
            <TodoList
              todos={todos}
              today={today}
              pendingCount={pendingTodoCount}
              onChange={fetchAll}
              onEdit={setTodoModal}
              onError={setError}
            />

            <UpcomingReminders meetings={upcomingMeetings} today={today} />
          </div>
        </div>
      )}

      {meetingModal.open && (
        <MeetingModal
          meeting={meetingModal.meeting}
          defaultDate={selectedDay}
          onSaved={async () => {
            setMeetingModal({ open: false, meeting: null });
            await fetchAll();
          }}
          onClose={() => setMeetingModal({ open: false, meeting: null })}
          onError={setError}
        />
      )}

      {todoModal && (
        <TodoModal
          todo={todoModal}
          onSaved={async () => {
            setTodoModal(null);
            await fetchAll();
          }}
          onClose={() => setTodoModal(null)}
          onError={setError}
        />
      )}
    </div>
  );
}

/* ---------------- SECTION 1: CALENDAR ---------------- */

function CalendarView({
  viewMonth,
  viewYear,
  today,
  selectedDay,
  meetingsByDay,
  onPrev,
  onNext,
  onToday,
  onSelect,
}: {
  viewMonth: number;
  viewYear: number;
  today: Date;
  selectedDay: Date;
  meetingsByDay: Map<string, Meeting[]>;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onSelect: (d: Date) => void;
}) {
  const cells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(viewYear, viewMonth, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [viewMonth, viewYear]);

  return (
    <section className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card sm:p-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          icon={<CalendarIcon className="h-4 w-4" />}
          title={`${MONTH_NAMES[viewMonth]} ${viewYear}`}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToday}
            className="rounded-lg border border-border bg-surface-2/60 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/50 hover:text-white"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrev}
              aria-label="Previous month"
              className="rounded-lg border border-border bg-surface-2/60 p-2 text-muted transition-colors hover:border-accent/50 hover:text-white"
            >
              <ChevronIcon className="h-4 w-4 rotate-180" />
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label="Next month"
              className="rounded-lg border border-border bg-surface-2/60 p-2 text-muted transition-colors hover:border-accent/50 hover:text-white"
            >
              <ChevronIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAY_LABELS.map((w, i) => {
          const weekend = i === 0 || i === 6;
          return (
            <div
              key={w}
              className={`pb-1 text-center text-[11px] font-semibold uppercase tracking-wider ${
                weekend ? "text-accent/70" : "text-muted"
              }`}
            >
              <span className="sm:hidden">{w.slice(0, 1)}</span>
              <span className="hidden sm:inline">{w}</span>
            </div>
          );
        })}

        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} className="aspect-square" />;
          const key = dayKey(cell);
          const dayMeetings = meetingsByDay.get(key) ?? [];
          const isToday = isSameDay(cell, today);
          const isSelected = isSameDay(cell, selectedDay);
          const weekend = cell.getDay() === 0 || cell.getDay() === 6;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(cell)}
              className={`group flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border transition-all duration-150 ${
                isSelected
                  ? "border-accent/50 bg-accent-soft"
                  : "border-transparent hover:border-border hover:bg-white/5"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors sm:text-base ${
                  isToday
                    ? "bg-accent text-white shadow-glow"
                    : isSelected
                      ? "text-white"
                      : weekend
                        ? "text-muted/60 group-hover:text-white"
                        : "text-muted group-hover:text-white"
                }`}
              >
                {cell.getDate()}
              </span>
              <span className="flex h-1.5 items-center justify-center gap-0.5">
                {dayMeetings.slice(0, 3).map((m, idx) => (
                  <span
                    key={m.id + idx}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />
                ))}
                {dayMeetings.length > 3 && (
                  <span className="text-[8px] font-semibold leading-none text-muted">
                    +{dayMeetings.length - 3}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- SECTION 2: DAY SCHEDULE ---------------- */

function DaySchedule({
  selectedDay,
  today,
  meetings,
  onAdd,
  onEdit,
  onDelete,
  onError,
}: {
  selectedDay: Date;
  today: Date;
  meetings: Meeting[];
  onAdd: () => void;
  onEdit: (m: Meeting) => void;
  onDelete: (id: string) => Promise<void>;
  onError: (e: string | null) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (deletingId) return;
    if (!window.confirm("Delete this meeting?")) return;
    setDeletingId(id);
    onError(null);
    try {
      await onDelete(id);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  const isToday = isSameDay(selectedDay, today);
  const heading = isToday
    ? "Today's schedule"
    : selectedDay.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

  return (
    <section className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <SectionHeader icon={<ClockIcon className="h-4 w-4" />} title={heading} />
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white shadow-glow transition-colors hover:bg-accent-hover"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add meeting
        </button>
      </div>

      {meetings.length === 0 ? (
        <EmptyState
          icon={<ClockIcon className="h-6 w-6" />}
          text="No meetings on this day."
          hint="Click + to add one."
        />
      ) : (
        <ul className="mt-5 space-y-3">
          {meetings.map((mtg) => {
            const cat = CATEGORY_MAP[mtg.category] ?? CATEGORY_MAP.other;
            return (
              <li
                key={mtg.id}
                className="group relative overflow-hidden rounded-xl border border-border/60 bg-surface-2/40 p-4 transition-all duration-150 hover:border-accent/40 hover:bg-surface-2/70"
                style={{ borderLeftWidth: 4, borderLeftColor: mtg.color }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex w-16 flex-shrink-0 flex-col">
                    <span className="text-sm font-semibold text-white">
                      {formatTime(mtg.startTime)}
                    </span>
                    {mtg.endTime && (
                      <span className="text-xs text-muted">{formatTime(mtg.endTime)}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{mtg.title}</p>
                    {mtg.location && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                        <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{mtg.location}</span>
                      </p>
                    )}
                    {mtg.description && (
                      <p className="mt-1.5 text-xs leading-relaxed text-muted">
                        {mtg.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-shrink-0 flex-col items-end gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                      style={{ backgroundColor: `${mtg.color}22`, color: mtg.color }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: mtg.color }}
                      />
                      {cat.label}
                    </span>
                    <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => onEdit(mtg)}
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
                        aria-label="Edit meeting"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(mtg.id)}
                        disabled={deletingId === mtg.id}
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                        aria-label="Delete meeting"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------------- SECTION 3: ADD / EDIT MEETING MODAL ---------------- */

function MeetingModal({
  meeting,
  defaultDate,
  onSaved,
  onClose,
  onError,
}: {
  meeting: Meeting | null;
  defaultDate: Date;
  onSaved: () => Promise<void>;
  onClose: () => void;
  onError: (e: string | null) => void;
}) {
  const editing = meeting !== null;
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [date, setDate] = useState(
    meeting ? dayKey(new Date(meeting.date)) : dayKey(defaultDate)
  );
  const [startTime, setStartTime] = useState(meeting?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(meeting?.endTime ?? "");
  const [location, setLocation] = useState(meeting?.location ?? "");
  const [description, setDescription] = useState(meeting?.description ?? "");
  const [category, setCategory] = useState(meeting?.category ?? "work");
  const [reminderMin, setReminderMin] = useState(meeting?.reminderMin ?? 30);
  const [submitting, setSubmitting] = useState(false);

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
      const payload = {
        title,
        date,
        startTime,
        endTime: endTime || undefined,
        location: location || undefined,
        description: description || undefined,
        category,
        reminderMin,
      };
      const res = await fetch("/api/planner/meetings", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: meeting.id, ...payload } : payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save meeting");
      }
      await onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save meeting");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={editing ? "Edit meeting" : "Add meeting"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sprint planning"
            className={inputClass}
            autoFocus
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field label="Start time">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field label="End time">
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Location">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </Field>

        <Field label="Description">
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            className={`${inputClass} resize-none`}
          />
        </Field>

        <Field label="Category">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = category === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-accent bg-accent-soft text-white"
                      : "border-border bg-surface-2/60 text-muted hover:text-white"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Reminder">
          <select
            value={reminderMin}
            onChange={(e) => setReminderMin(parseInt(e.target.value, 10))}
            className={inputClass}
          >
            {REMINDER_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-glow transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Saving…" : editing ? "Save changes" : "Save meeting"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-surface-2/60 px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-white"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- SECTION 4: TODO LIST ---------------- */

function TodoList({
  todos,
  today,
  pendingCount,
  onChange,
  onEdit,
  onError,
}: {
  todos: Todo[];
  today: Date;
  pendingCount: number;
  onChange: () => Promise<void>;
  onEdit: (t: Todo) => void;
  onError: (e: string | null) => void;
}) {
  const [filter, setFilter] = useState<TodoFilter>("all");
  const [quickAdd, setQuickAdd] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return todos.filter((t) => {
      if (filter === "completed") return t.completed;
      if (filter === "all") return true;
      // "today" and "upcoming" only show pending, dated tasks.
      if (t.completed || !t.dueDate) return false;
      const due = startOfDay(new Date(t.dueDate));
      const diff = daysBetween(today, due);
      if (filter === "today") return diff === 0;
      if (filter === "upcoming") return diff > 0;
      return true;
    });
  }, [todos, filter, today]);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (adding) return;
    if (!quickAdd.trim()) return;
    setAdding(true);
    onError(null);
    try {
      const res = await fetch("/api/planner/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: quickAdd }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add todo");
      }
      setQuickAdd("");
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to add todo");
    } finally {
      setAdding(false);
    }
  }

  async function toggle(todo: Todo) {
    if (busyId) return;
    setBusyId(todo.id);
    onError(null);
    try {
      const res = await fetch("/api/planner/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: todo.id, completed: !todo.completed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update");
      }
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (busyId) return;
    setBusyId(id);
    onError(null);
    try {
      const res = await fetch(`/api/planner/todos?id=${encodeURIComponent(id)}`, {
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
      setBusyId(null);
    }
  }

  const FILTERS: { key: TodoFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
  ];

  const emptyText: Record<TodoFilter, string> = {
    all: "No tasks yet. Add one above to get started.",
    today: "Nothing due today. Enjoy the breathing room.",
    upcoming: "No upcoming tasks scheduled.",
    completed: "No completed tasks yet.",
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card sm:p-6">
      <div className="flex items-center justify-between">
        <SectionHeader icon={<CheckSquareIcon className="h-4 w-4" />} title="To-dos" />
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
          {pendingCount} pending
        </span>
      </div>

      <form onSubmit={handleQuickAdd} className="relative mt-5">
        <PlusIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
          placeholder="Add a task and press Enter…"
          className={`${inputClass} pl-9 pr-20`}
          disabled={adding}
        />
        <button
          type="submit"
          disabled={adding || !quickAdd.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          Add
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-accent text-white shadow-glow"
                : "bg-surface-2/60 text-muted hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<CheckSquareIcon className="h-6 w-6" />} text={emptyText[filter]} />
      ) : (
        <ul className="mt-4 space-y-2.5">
          {filtered.map((todo) => {
            const prio = priorityInfo(todo.priority);
            const due = todo.dueDate ? new Date(todo.dueDate) : null;
            return (
              <li
                key={todo.id}
                className="group flex items-start gap-3 rounded-xl border border-border/60 bg-surface-2/40 p-3.5 transition-all duration-150 hover:border-accent/40 hover:bg-surface-2/70"
                style={{ borderLeftWidth: 4, borderLeftColor: prio.color }}
              >
                <button
                  type="button"
                  onClick={() => toggle(todo)}
                  disabled={busyId === todo.id}
                  aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-50 ${
                    todo.completed
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-transparent hover:border-accent"
                  }`}
                >
                  {todo.completed && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm transition-all duration-300 ${
                      todo.completed
                        ? "text-muted line-through opacity-50"
                        : "text-white"
                    }`}
                  >
                    {todo.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${prio.badge}`}
                    >
                      {prio.label}
                    </span>
                    {due && (
                      <span className="text-[11px] text-muted">
                        {relativeDayLabel(due, today)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => onEdit(todo)}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
                    aria-label="Edit todo"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(todo.id)}
                    disabled={busyId === todo.id}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                    aria-label="Delete todo"
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
  );
}

/* ---------------- TODO EDIT MODAL ---------------- */

function TodoModal({
  todo,
  onSaved,
  onClose,
  onError,
}: {
  todo: Todo;
  onSaved: () => Promise<void>;
  onClose: () => void;
  onError: (e: string | null) => void;
}) {
  const [title, setTitle] = useState(todo.title);
  const [priority, setPriority] = useState(todo.priority);
  const [category, setCategory] = useState(todo.category);
  const [dueDate, setDueDate] = useState(
    todo.dueDate ? dayKey(new Date(todo.dueDate)) : ""
  );
  const [submitting, setSubmitting] = useState(false);

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
      const res = await fetch("/api/planner/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: todo.id,
          title,
          priority,
          category,
          dueDate: dueDate || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save todo");
      }
      await onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save todo");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Edit task" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            autoFocus
            required
          />
        </Field>

        <Field label="Priority">
          <div className="flex flex-wrap gap-2">
            {PRIORITIES.map((p) => {
              const active = priority === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPriority(p.key)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-accent bg-accent-soft text-white"
                      : "border-border bg-surface-2/60 text-muted hover:text-white"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.label}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
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
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-glow transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-surface-2/60 px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-white"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- SECTION 5: UPCOMING REMINDERS ---------------- */

function UpcomingReminders({ meetings, today }: { meetings: Meeting[]; today: Date }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card sm:p-6">
      <SectionHeader
        icon={<BellIcon className="h-4 w-4" />}
        title="Upcoming reminders"
        subtitle="Next 7 days"
      />

      {meetings.length === 0 ? (
        <EmptyState icon={<BellIcon className="h-6 w-6" />} text="Nothing coming up this week." />
      ) : (
        <ol className="mt-5 space-y-1">
          {meetings.map((mtg, i) => {
            const d = new Date(mtg.date);
            const diff = daysBetween(today, d);
            const badge =
              diff === 0
                ? "bg-accent-soft text-accent"
                : diff === 1
                  ? "bg-amber-500/15 text-amber-300"
                  : "bg-white/5 text-muted";
            const isLast = i === meetings.length - 1;
            return (
              <li key={mtg.id} className="relative flex gap-4 pb-4">
                {/* timeline rail */}
                <div className="relative flex flex-col items-center">
                  <span
                    className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full ring-4 ring-surface"
                    style={{ backgroundColor: mtg.color }}
                  />
                  {!isLast && (
                    <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
                  )}
                </div>

                <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-surface-2/40 p-3 transition-colors hover:border-accent/40">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium text-white">{mtg.title}</p>
                    <span
                      className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badge}`}
                    >
                      {relativeDayLabel(d, today)}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {formatTime(mtg.startTime)}
                    {mtg.location ? ` · ${mtg.location}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/* ---------------- shared ---------------- */

const inputClass =
  "w-full rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm text-white placeholder:text-muted/70 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
        {icon}
      </span>
      <div>
        <h2 className="text-base font-semibold leading-tight text-white">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  text,
  hint,
}: {
  icon: React.ReactNode;
  text: string;
  hint?: string;
}) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface-2/20 px-4 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2/60 text-muted">
        {icon}
      </span>
      <p className="mt-3 text-sm font-medium text-white">{text}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg animate-fade-up overflow-y-auto rounded-t-2xl border border-border/60 bg-surface shadow-card sm:rounded-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border/60 bg-surface/95 px-5 py-4 backdrop-blur-md">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- icons ---------------- */

function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function CheckSquareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function BellIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
    </svg>
  );
}

function ChevronIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function MapPinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
