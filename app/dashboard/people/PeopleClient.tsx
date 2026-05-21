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

type Contact = {
  id: string;
  name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  priority: string;
  createdAt: string;
  interactions?: { date: string }[];
};

type Interaction = {
  id: string;
  contactId: string;
  date: string;
  type: string;
  notes: string | null;
  mood: string | null;
  contact?: { id: string; name: string; relationship: string };
};

type Challenge = {
  id: string;
  date: string;
  challenge: string;
  completed: boolean;
  notes: string | null;
};

type SocialEnergy = {
  id: string;
  date: string;
  energy: number;
  notes: string | null;
};

type TabKey = "contacts" | "interactions" | "challenges" | "energy";

const TABS: { key: TabKey; label: string }[] = [
  { key: "contacts", label: "Contacts" },
  { key: "interactions", label: "Interactions" },
  { key: "challenges", label: "Challenges" },
  { key: "energy", label: "Social Energy" },
];

const RELATIONSHIPS = [
  "Family",
  "Friend",
  "Colleague",
  "Mentor",
  "Business",
  "Acquaintance",
] as const;
const PRIORITIES = ["High", "Medium", "Low"] as const;
const INTERACTION_TYPES = ["Call", "Message", "Meeting", "Coffee", "Video Call"] as const;
const MOODS = ["Good", "Neutral", "Awkward", "Great"] as const;

const CHALLENGE_PROMPTS = [
  "Start a conversation with someone new today",
  "Send an appreciation message to a friend",
  "Call a family member you haven't spoken to in a while",
  "Ask someone how they are doing genuinely",
  "Share something useful with a colleague",
  "Give someone a genuine compliment",
  "Reach out to an old friend",
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

function daysBetween(a: Date, b: Date) {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function relationshipBadge(rel: string) {
  switch (rel) {
    case "Family":
      return "bg-pink-500/15 text-pink-300 border-pink-500/30";
    case "Friend":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "Colleague":
      return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    case "Mentor":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "Business":
      return "bg-violet-500/15 text-violet-300 border-violet-500/30";
    case "Acquaintance":
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

function priorityBadge(p: string) {
  switch (p) {
    case "High":
      return "bg-rose-500/15 text-rose-300";
    case "Low":
      return "bg-slate-500/15 text-slate-300";
    case "Medium":
    default:
      return "bg-amber-500/15 text-amber-300";
  }
}

function lastContactedLabel(contact: Contact, today: Date) {
  const last = contact.interactions?.[0]?.date;
  if (!last) return { label: "Never contacted", days: Infinity };
  const days = daysBetween(new Date(last), today);
  if (days <= 0) return { label: "Contacted today", days: 0 };
  if (days === 1) return { label: "1 day ago", days };
  return { label: `${days} days ago`, days };
}

function pickChallengeForDay(d: Date) {
  const key = dayKey(d);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return CHALLENGE_PROMPTS[hash % CHALLENGE_PROMPTS.length];
}

export default function PeopleClient() {
  const [tab, setTab] = useState<TabKey>("contacts");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [energyLogs, setEnergyLogs] = useState<SocialEnergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [c, i, ch, e] = await Promise.all([
        fetch("/api/people/contacts", { cache: "no-store" }),
        fetch("/api/people/interactions", { cache: "no-store" }),
        fetch("/api/people/challenges", { cache: "no-store" }),
        fetch("/api/people/socialenergy", { cache: "no-store" }),
      ]);
      if (!c.ok) throw new Error("Failed to load contacts");
      if (!i.ok) throw new Error("Failed to load interactions");
      if (!ch.ok) throw new Error("Failed to load challenges");
      if (!e.ok) throw new Error("Failed to load social energy");
      const cJ = await c.json();
      const iJ = await i.json();
      const chJ = await ch.json();
      const eJ = await e.json();
      setContacts(cJ.contacts ?? []);
      setInteractions(iJ.interactions ?? []);
      setChallenges(chJ.challenges ?? []);
      setEnergyLogs(eJ.logs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
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

  const interactionsThisWeek = useMemo(() => {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return interactions.filter((i) => new Date(i.date) >= start);
  }, [interactions, today]);

  const needsFollowUp = useMemo(() => {
    return contacts.filter((c) => {
      const { days } = lastContactedLabel(c, today);
      return days >= 30;
    });
  }, [contacts, today]);

  const todayChallenge = useMemo(() => {
    return challenges.find((c) => isSameDay(new Date(c.date), today)) ?? null;
  }, [challenges, today]);

  return (
    <div className="mt-8 space-y-8">
      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Total contacts" value={`${contacts.length}`} tone="pink" />
        <SummaryCard
          label="Interactions this week"
          value={`${interactionsThisWeek.length}`}
          tone="violet"
        />
        <SummaryCard
          label="Need follow-up (30+ d)"
          value={`${needsFollowUp.length}`}
          tone="amber"
        />
        <SummaryCard
          label="Today's challenge"
          value={todayChallenge ? (todayChallenge.completed ? "Done" : "Pending") : "Not set"}
          tone={todayChallenge?.completed ? "emerald" : "pink"}
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
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-pink-400" />
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (
            <>
              {tab === "contacts" && (
                <ContactsTab
                  contacts={contacts}
                  interactions={interactions}
                  today={today}
                  onChange={fetchAll}
                  onError={setError}
                />
              )}
              {tab === "interactions" && (
                <InteractionsTab
                  contacts={contacts}
                  interactions={interactions}
                  today={today}
                  onChange={fetchAll}
                  onError={setError}
                />
              )}
              {tab === "challenges" && (
                <ChallengesTab
                  challenges={challenges}
                  today={today}
                  onChange={fetchAll}
                  onError={setError}
                />
              )}
              {tab === "energy" && (
                <EnergyTab
                  energyLogs={energyLogs}
                  today={today}
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

/* ---------------- CONTACTS ---------------- */

function ContactsTab({
  contacts,
  interactions,
  today,
  onChange,
  onError,
}: {
  contacts: Contact[];
  interactions: Interaction[];
  today: Date;
  onChange: () => Promise<void>;
  onError: (e: string | null) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<(typeof RELATIONSHIPS)[number]>("Friend");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("Medium");

  const [logFor, setLogFor] = useState<Contact | null>(null);
  const [logType, setLogType] = useState<(typeof INTERACTION_TYPES)[number]>("Call");
  const [logMood, setLogMood] = useState<(typeof MOODS)[number] | "">("");
  const [logNotes, setLogNotes] = useState("");
  const [logSubmitting, setLogSubmitting] = useState(false);

  function resetForm() {
    setName("");
    setRelationship("Friend");
    setPhone("");
    setEmail("");
    setNotes("");
    setPriority("Medium");
  }

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
      const res = await fetch("/api/people/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          relationship,
          phone: phone || undefined,
          email: email || undefined,
          notes: notes || undefined,
          priority,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add contact");
      }
      resetForm();
      setShowAdd(false);
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    if (!window.confirm("Delete this contact? All interactions will be removed.")) return;
    setDeletingId(id);
    onError(null);
    try {
      const res = await fetch(`/api/people/contacts?id=${encodeURIComponent(id)}`, {
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

  async function handleLogInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!logFor || logSubmitting) return;
    onError(null);
    setLogSubmitting(true);
    try {
      const res = await fetch("/api/people/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: logFor.id,
          type: logType,
          notes: logNotes || undefined,
          mood: logMood || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to log interaction");
      }
      setLogFor(null);
      setLogNotes("");
      setLogMood("");
      setLogType("Call");
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to log");
    } finally {
      setLogSubmitting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.name.toLowerCase().includes(q));
  }, [contacts, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts…"
          className={`${inputClass} sm:max-w-sm`}
        />
        <button
          type="button"
          onClick={() => setShowAdd((s) => !s)}
          className="rounded-lg bg-pink-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pink-500"
        >
          {showAdd ? "Cancel" : "+ Add contact"}
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="space-y-4 rounded-xl border border-border/60 bg-surface-2/40 p-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className={inputClass}
                required
              />
            </Field>
            <Field label="Relationship">
              <select
                value={relationship}
                onChange={(e) =>
                  setRelationship(e.target.value as (typeof RELATIONSHIPS)[number])
                }
                className={inputClass}
              >
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </Field>
            <Field label="Priority">
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as (typeof PRIORITIES)[number])
                }
                className={inputClass}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className={`${inputClass} resize-none`}
            />
          </Field>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-pink-500/90 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Adding…" : "Add contact"}
          </button>
        </form>
      )}

      {logFor && (
        <form
          onSubmit={handleLogInteraction}
          className="space-y-4 rounded-xl border border-pink-500/40 bg-pink-500/5 p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Log interaction with{" "}
              <span className="text-pink-300">{logFor.name}</span>
            </h3>
            <button
              type="button"
              onClick={() => setLogFor(null)}
              className="text-xs text-muted hover:text-white"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Type">
              <select
                value={logType}
                onChange={(e) =>
                  setLogType(e.target.value as (typeof INTERACTION_TYPES)[number])
                }
                className={inputClass}
              >
                {INTERACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mood">
              <select
                value={logMood}
                onChange={(e) =>
                  setLogMood(e.target.value as (typeof MOODS)[number] | "")
                }
                className={inputClass}
              >
                <option value="">—</option>
                {MOODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              rows={2}
              value={logNotes}
              onChange={(e) => setLogNotes(e.target.value)}
              placeholder="What did you talk about?"
              className={`${inputClass} resize-none`}
            />
          </Field>
          <button
            type="submit"
            disabled={logSubmitting}
            className="w-full rounded-lg bg-pink-500/90 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {logSubmitting ? "Saving…" : "Log interaction"}
          </button>
        </form>
      )}

      <section>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted">
            {contacts.length === 0
              ? "No contacts yet. Add one to get started."
              : "No matching contacts."}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((c) => {
              const { label, days } = lastContactedLabel(c, today);
              const followUp =
                days >= 60
                  ? "bg-rose-500/10 border-rose-500/40"
                  : days >= 30
                    ? "bg-amber-500/10 border-amber-500/40"
                    : "bg-surface-2/40 border-border/60";
              return (
                <li
                  key={c.id}
                  className={`rounded-xl border ${followUp} p-3 transition-colors`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setLogFor(c)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">
                          {c.name}
                        </p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${relationshipBadge(
                            c.relationship
                          )}`}
                        >
                          {c.relationship}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityBadge(
                            c.priority
                          )}`}
                        >
                          {c.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        Last contacted: <span className="text-white/80">{label}</span>
                        {c.phone && <span className="ml-2">· {c.phone}</span>}
                        {c.email && <span className="ml-2">· {c.email}</span>}
                      </p>
                      {c.notes && (
                        <p className="mt-1 text-xs italic text-muted">{c.notes}</p>
                      )}
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLogFor(c)}
                        className="rounded-lg border border-border bg-surface-2/60 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-pink-500/30"
                      >
                        Log
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {interactions.length > 0 && (
        <p className="text-xs text-muted">
          {interactions.length} total interactions logged across {contacts.length}{" "}
          contacts.
        </p>
      )}
    </div>
  );
}

/* ---------------- INTERACTIONS ---------------- */

function InteractionsTab({
  contacts,
  interactions,
  today,
  onChange,
  onError,
}: {
  contacts: Contact[];
  interactions: Interaction[];
  today: Date;
  onChange: () => Promise<void>;
  onError: (e: string | null) => void;
}) {
  const [contactId, setContactId] = useState<string>("");
  const [type, setType] = useState<(typeof INTERACTION_TYPES)[number]>("Call");
  const [mood, setMood] = useState<(typeof MOODS)[number] | "">("");
  const [date, setDate] = useState<string>(dayKey(today));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!contactId && contacts.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setContactId(contacts[0].id);
    }
  }, [contacts, contactId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    onError(null);
    if (!contactId) {
      onError("Select a contact");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/people/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          type,
          mood: mood || undefined,
          date: date ? new Date(date).toISOString() : undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to log");
      }
      setNotes("");
      setMood("");
      setType("Call");
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to log");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    if (!window.confirm("Delete this interaction?")) return;
    setDeletingId(id);
    onError(null);
    try {
      const res = await fetch(`/api/people/interactions?id=${encodeURIComponent(id)}`, {
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

  const weeklyChartData = useMemo(() => {
    const out: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      const count = interactions.filter((it) => dayKey(new Date(it.date)) === key).length;
      out.push({
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        count,
      });
    }
    return out;
  }, [interactions, today]);

  const mostActive = useMemo(() => {
    const counts = new Map<string, { contact: Contact; count: number }>();
    for (const it of interactions) {
      const c = contacts.find((x) => x.id === it.contactId);
      if (!c) continue;
      const cur = counts.get(c.id);
      if (cur) {
        cur.count++;
      } else {
        counts.set(c.id, { contact: c, count: 1 });
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [interactions, contacts]);

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-border/60 bg-surface-2/40 p-4"
      >
        <h3 className="text-sm font-semibold text-white">Log an interaction</h3>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted">
            Add a contact first before logging interactions.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Contact">
                <select
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className={inputClass}
                >
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Type">
                <select
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as (typeof INTERACTION_TYPES)[number])
                  }
                  className={inputClass}
                >
                  {INTERACTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Mood">
                <select
                  value={mood}
                  onChange={(e) =>
                    setMood(e.target.value as (typeof MOODS)[number] | "")
                  }
                  className={inputClass}
                >
                  <option value="">—</option>
                  {MOODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Notes">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you talk about?"
                className={`${inputClass} resize-none`}
              />
            </Field>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-pink-500/90 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Log interaction"}
            </button>
          </>
        )}
      </form>

      <section className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Last 7 days</h3>
          <span className="text-xs text-muted">interactions logged</span>
        </div>
        <div className="mt-4 h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={weeklyChartData}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="#1F2A52" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#9AA3C7"
                tick={{ fill: "#9AA3C7", fontSize: 11 }}
                axisLine={{ stroke: "#1F2A52" }}
                tickLine={false}
              />
              <YAxis
                stroke="#9AA3C7"
                tick={{ fill: "#9AA3C7", fontSize: 11 }}
                axisLine={{ stroke: "#1F2A52" }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(236, 72, 153, 0.08)" }}
                contentStyle={{
                  background: "#0E1430",
                  border: "1px solid #1F2A52",
                  borderRadius: 8,
                  color: "#fff",
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#EC4899" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
          <h3 className="text-sm font-semibold text-white">Most active relationships</h3>
          {mostActive.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No interactions yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {mostActive.map(({ contact, count }) => (
                <li
                  key={contact.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm text-white">{contact.name}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${relationshipBadge(
                        contact.relationship
                      )}`}
                    >
                      {contact.relationship}
                    </span>
                  </div>
                  <span className="rounded-full bg-pink-500/15 px-2 py-0.5 text-xs font-medium text-pink-300">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
          <h3 className="text-sm font-semibold text-white">Recent interactions</h3>
          {interactions.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nothing logged yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {interactions.slice(0, 6).map((i) => (
                <li
                  key={i.id}
                  className="rounded-lg border border-border/60 bg-surface/40 p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-white">
                      {i.contact?.name ?? "Unknown"}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDelete(i.id)}
                      disabled={deletingId === i.id}
                      className="text-[10px] text-muted hover:text-rose-300 disabled:opacity-50"
                    >
                      delete
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {i.type} · {new Date(i.date).toLocaleDateString()}
                    {i.mood && <span> · {i.mood}</span>}
                  </p>
                  {i.notes && (
                    <p className="mt-1 text-xs italic text-muted">{i.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------------- CHALLENGES ---------------- */

function ChallengesTab({
  challenges,
  today,
  onChange,
  onError,
}: {
  challenges: Challenge[];
  today: Date;
  onChange: () => Promise<void>;
  onError: (e: string | null) => void;
}) {
  const [customText, setCustomText] = useState("");
  const [submittingCustom, setSubmittingCustom] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const todayChallenge = useMemo(
    () => challenges.find((c) => isSameDay(new Date(c.date), today)) ?? null,
    [challenges, today]
  );

  const suggestion = useMemo(() => pickChallengeForDay(today), [today]);

  async function ensureTodayChallenge(text: string) {
    if (creating) return;
    setCreating(true);
    onError(null);
    try {
      const res = await fetch("/api/people/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge: text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create challenge");
      }
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function toggleComplete(c: Challenge) {
    if (busyId) return;
    setBusyId(c.id);
    onError(null);
    try {
      const res = await fetch("/api/people/challenges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, completed: !c.completed }),
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

  async function addCustom(e: React.FormEvent) {
    e.preventDefault();
    if (submittingCustom) return;
    if (!customText.trim()) {
      onError("Challenge text is required");
      return;
    }
    setSubmittingCustom(true);
    onError(null);
    try {
      const res = await fetch("/api/people/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge: customText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add");
      }
      setCustomText("");
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSubmittingCustom(false);
    }
  }

  const streak = useMemo(() => {
    const completedByDay = new Set<string>();
    for (const c of challenges) {
      if (c.completed) completedByDay.add(dayKey(new Date(c.date)));
    }
    let s = 0;
    const cursor = new Date(today);
    while (true) {
      const key = dayKey(cursor);
      if (completedByDay.has(key)) {
        s++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (s === 0 && isSameDay(cursor, today)) {
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return s;
  }, [challenges, today]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-500/10 via-surface-2/40 to-purple-500/10 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-pink-300">
              Today&apos;s challenge
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {todayChallenge?.challenge ?? suggestion}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted">Streak</p>
            <p className="mt-1 text-2xl font-semibold text-white">🔥 {streak}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {todayChallenge ? (
            <button
              type="button"
              onClick={() => toggleComplete(todayChallenge)}
              disabled={busyId === todayChallenge.id}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                todayChallenge.completed
                  ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                  : "bg-pink-500/90 text-white hover:bg-pink-500"
              }`}
            >
              {todayChallenge.completed ? "✓ Completed" : "Mark complete"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => ensureTodayChallenge(suggestion)}
              disabled={creating}
              className="flex-1 rounded-lg bg-pink-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Setting up…" : "Accept today's challenge"}
            </button>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
        <h3 className="text-sm font-semibold text-white">Suggestions</h3>
        <ul className="mt-3 space-y-2">
          {CHALLENGE_PROMPTS.map((p) => (
            <li
              key={p}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-surface/40 px-3 py-2"
            >
              <span className="text-sm text-white">{p}</span>
              <button
                type="button"
                onClick={() => ensureTodayChallenge(p)}
                disabled={creating}
                className="rounded-md border border-border bg-surface-2/60 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-pink-500/30 disabled:opacity-50"
              >
                Use
              </button>
            </li>
          ))}
        </ul>
      </section>

      <form
        onSubmit={addCustom}
        className="space-y-3 rounded-xl border border-border/60 bg-surface-2/40 p-4"
      >
        <h3 className="text-sm font-semibold text-white">Add custom challenge</h3>
        <textarea
          rows={2}
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="What will you do today to connect?"
          className={`${inputClass} resize-none`}
        />
        <button
          type="submit"
          disabled={submittingCustom}
          className="w-full rounded-lg bg-pink-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submittingCustom ? "Adding…" : "Add challenge"}
        </button>
      </form>

      <section>
        <h3 className="text-sm font-semibold text-white">Recent challenges</h3>
        {challenges.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No challenges yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {challenges.slice(0, 10).map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-surface-2/40 p-3"
              >
                <button
                  type="button"
                  onClick={() => toggleComplete(c)}
                  disabled={busyId === c.id}
                  aria-label={c.completed ? "Uncheck" : "Check"}
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-50 ${
                    c.completed
                      ? "border-pink-400 bg-pink-500 text-white"
                      : "border-border hover:border-pink-400"
                  }`}
                >
                  {c.completed && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      c.completed ? "text-muted line-through" : "text-white"
                    }`}
                  >
                    {c.challenge}
                  </p>
                  <p className="text-[11px] text-muted">
                    {new Date(c.date).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------------- SOCIAL ENERGY ---------------- */

function EnergyTab({
  energyLogs,
  today,
  onChange,
  onError,
}: {
  energyLogs: SocialEnergy[];
  today: Date;
  onChange: () => Promise<void>;
  onError: (e: string | null) => void;
}) {
  const todayLog = useMemo(
    () => energyLogs.find((e) => isSameDay(new Date(e.date), today)) ?? null,
    [energyLogs, today]
  );

  const [energy, setEnergy] = useState<number>(todayLog?.energy ?? 5);
  const [notes, setNotes] = useState<string>(todayLog?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnergy(todayLog?.energy ?? 5);
    setNotes(todayLog?.notes ?? "");
  }, [todayLog]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    onError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/people/socialenergy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ energy, notes: notes || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  const trend = useMemo(() => {
    const out: { label: string; energy: number | null }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      const log = energyLogs.find((e) => dayKey(new Date(e.date)) === key);
      out.push({
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        energy: log ? log.energy : null,
      });
    }
    return out;
  }, [energyLogs, today]);

  const weeklyAvg = useMemo(() => {
    const vals = trend.map((t) => t.energy).filter((v): v is number => v !== null);
    if (vals.length === 0) return null;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  }, [trend]);

  const tip = useMemo(() => {
    const score = todayLog?.energy ?? energy;
    if (score < 4)
      return {
        tone: "rose" as const,
        text: "Take time alone to recharge. It is okay to say no.",
      };
    if (score <= 7)
      return {
        tone: "amber" as const,
        text: "Good balance. Keep one meaningful connection today.",
      };
    return {
      tone: "emerald" as const,
      text: "Great energy. Reach out to someone new today.",
    };
  }, [todayLog, energy]);

  const tipStyles: Record<typeof tip.tone, string> = {
    rose: "border-rose-500/40 bg-rose-500/10 text-rose-200",
    amber: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-border/60 bg-surface-2/40 p-4"
      >
        <div>
          <h3 className="text-sm font-semibold text-white">
            {todayLog ? "Update today's check-in" : "Today's check-in"}
          </h3>
          <p className="mt-1 text-xs text-muted">
            How drained or energised do you feel after social interactions today?
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Drained</span>
            <span className="text-sm font-semibold text-white">{energy}/10</span>
            <span>Energised</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={energy}
            onChange={(e) => setEnergy(parseInt(e.target.value, 10))}
            className="mt-2 w-full accent-pink-400"
          />
        </div>
        <Field label="Notes">
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What shaped your social energy today?"
            className={`${inputClass} resize-none`}
          />
        </Field>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-pink-500/90 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : todayLog ? "Update check-in" : "Save check-in"}
        </button>
      </form>

      <div className={`rounded-xl border p-4 ${tipStyles[tip.tone]}`}>
        <p className="text-xs uppercase tracking-wider opacity-80">Tip for today</p>
        <p className="mt-1 text-sm font-medium">{tip.text}</p>
      </div>

      <section className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">7-day energy trend</h3>
          <span className="text-xs text-muted">
            Avg{" "}
            <span className="text-white">
              {weeklyAvg !== null ? weeklyAvg.toFixed(1) : "—"}
            </span>
          </span>
        </div>
        <div className="mt-4 h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trend}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="#1F2A52" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#9AA3C7"
                tick={{ fill: "#9AA3C7", fontSize: 11 }}
                axisLine={{ stroke: "#1F2A52" }}
                tickLine={false}
              />
              <YAxis
                stroke="#9AA3C7"
                tick={{ fill: "#9AA3C7", fontSize: 11 }}
                axisLine={{ stroke: "#1F2A52" }}
                tickLine={false}
                domain={[0, 10]}
              />
              <Tooltip
                cursor={{ stroke: "#EC4899", strokeWidth: 1 }}
                contentStyle={{
                  background: "#0E1430",
                  border: "1px solid #1F2A52",
                  borderRadius: 8,
                  color: "#fff",
                }}
              />
              <Line
                type="monotone"
                dataKey="energy"
                stroke="#EC4899"
                strokeWidth={2.5}
                dot={{ fill: "#EC4899", r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-white">Recent check-ins</h3>
        {energyLogs.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No check-ins yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {energyLogs.slice(0, 7).map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface-2/40 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">
                    {new Date(l.date).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  {l.notes && <p className="mt-0.5 text-xs text-muted">{l.notes}</p>}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    l.energy >= 8
                      ? "bg-emerald-500/15 text-emerald-300"
                      : l.energy >= 4
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-rose-500/15 text-rose-300"
                  }`}
                >
                  {l.energy}/10
                </span>
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
  "w-full rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm text-white placeholder:text-muted/70 outline-none transition-colors focus:border-pink-400 focus:ring-1 focus:ring-pink-400";

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
  tone: "pink" | "violet" | "amber" | "emerald";
}) {
  const toneStyles: Record<typeof tone, string> = {
    pink: "text-pink-300",
    violet: "text-violet-300",
    amber: "text-amber-300",
    emerald: "text-emerald-300",
  };
  return (
    <div className="rounded-2xl border border-border/60 bg-surface/60 p-4 shadow-card sm:p-5">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneStyles[tone]}`}>{value}</p>
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
