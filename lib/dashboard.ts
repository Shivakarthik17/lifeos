import { prisma } from "@/lib/prisma";

/**
 * Real dashboard engine for LifeOS.
 *
 * Reads the user's actual data from every module and turns it into:
 *  - a score (0-100) per module for today
 *  - one overall Life Score
 *  - a short, human status line per module
 *  - a 7-day Life Score trend (one score per day)
 *  - a data-driven "daily brief" that targets the weakest module
 *
 * Everything here is plain rules + math on real database rows.
 * Each day's score is computed using only the data available up to that day,
 * so the trend is historically honest.
 */

export type ModuleKey =
  | "finance"
  | "fitness"
  | "mind"
  | "business"
  | "discipline"
  | "people";

export interface ModuleResult {
  key: ModuleKey;
  /** 0-100, or null when there is no data yet for this module */
  score: number | null;
  /** short human-readable line shown on the card */
  status: string;
}

export interface TrendPoint {
  /** short label for the X axis, e.g. "Mon 26" */
  label: string;
  /** Life Score that day, or null when nothing was tracked */
  score: number | null;
}

export interface DashboardData {
  lifeScore: number;
  modules: Record<ModuleKey, ModuleResult>;
  trend: TrendPoint[];
  brief: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const avg = (nums: number[]) =>
  nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ---------- raw data shape (only the fields we read) ----------

interface RawData {
  transactions: { type: string; amount: number; date: Date }[];
  workouts: { date: Date }[];
  sleepLogs: { date: Date; hours: number }[];
  medLogs: { date: Date }[];
  journal: { date: Date; mood: number }[];
  habits: { id: string; frequency: string; createdAt: Date }[];
  checkIns: { habitId: string; date: Date }[];
  goals: { status: string; progress: number; createdAt: Date; completedAt: Date | null }[];
  tasks: { status: string; createdAt: Date }[];
  interactions: { date: Date; contactId: string }[];
  contacts: { id: string; name: string; priority: string; createdAt: Date }[];
}

export async function getDashboardData(email: string): Promise<DashboardData> {
  try {
    if (!email) return safeDefault();

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user?.id) return safeDefault();
    const userId = user.id;

    const today = startOfDay(new Date());
    // Widest window we need: a 30-day window ending on the oldest trend day
    // (6 days ago) reaches back 36 days. Fetch a little extra to be safe.
    const since = addDays(today, -40);

    // Each query is wrapped so that one failing model never takes the whole
    // dashboard down — it just contributes empty data for that module.
    const [
      transactions,
      workouts,
      sleepLogs,
      medLogs,
      journal,
      habits,
      checkIns,
      goals,
      tasks,
      interactions,
      contacts,
    ] = await Promise.all([
      safeQuery(() => prisma.transaction.findMany({ where: { userId, date: { gte: since } } })),
      safeQuery(() => prisma.workout.findMany({ where: { userId, date: { gte: since } } })),
      safeQuery(() => prisma.sleepLog.findMany({ where: { userId, date: { gte: since } } })),
      safeQuery(() => prisma.meditationLog.findMany({ where: { userId, date: { gte: since } } })),
      safeQuery(() => prisma.journalEntry.findMany({ where: { userId, date: { gte: since } } })),
      safeQuery(() => prisma.habit.findMany({ where: { userId } })),
      safeQuery(() => prisma.habitCheckIn.findMany({ where: { userId, date: { gte: since } } })),
      safeQuery(() => prisma.goal.findMany({ where: { userId } })),
      safeQuery(() => prisma.task.findMany({ where: { userId } })),
      safeQuery(() => prisma.interaction.findMany({ where: { userId, date: { gte: since } } })),
      safeQuery(() => prisma.contact.findMany({ where: { userId } })),
    ]);

    const raw: RawData = {
      transactions: transactions ?? [],
      workouts: workouts ?? [],
      sleepLogs: sleepLogs ?? [],
      medLogs: medLogs ?? [],
      journal: journal ?? [],
      habits: habits ?? [],
      checkIns: checkIns ?? [],
      goals: goals ?? [],
      tasks: tasks ?? [],
      interactions: interactions ?? [],
      contacts: contacts ?? [],
    };

    // Today's full breakdown.
    const modules = computeModules(raw, today);
    const lifeScore = lifeScoreFrom(modules);

    // 7-day trend (oldest -> newest), one score per day.
    const trend: TrendPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = addDays(today, -i);
      const dayModules = computeModules(raw, day);
      const dayScored = scoresOf(dayModules);
      trend.push({
        label: day.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
        score: dayScored.length ? clamp(avg(dayScored)) : null,
      });
    }

    return { lifeScore, modules, trend, brief: buildBrief(modules, lifeScore) };
  } catch (error) {
    console.error("Dashboard data error:", error);
    return safeDefault();
  }
}

/**
 * Runs a single Prisma query and never throws.
 * On any failure it logs and returns an empty array, so one broken
 * model degrades gracefully instead of crashing the whole page.
 */
async function safeQuery<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    const result = await fn();
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Dashboard query failed:", error);
    return [];
  }
}

// ---------- compute all modules as of a reference day ----------

function computeModules(raw: RawData, ref: Date): Record<ModuleKey, ModuleResult> {
  const endEx = addDays(ref, 1); // include all of the reference day
  const weekStart = addDays(ref, -6); // 7-day window ending on ref
  const monthStart = addDays(ref, -29); // 30-day window ending on ref

  const inWindow = (d: Date, start: Date) => {
    const t = new Date(d);
    return t >= start && t < endEx;
  };
  const createdBy = (d: Date) => new Date(d) < endEx;

  const finance = scoreFinance(
    raw.transactions.filter((t) => inWindow(t.date, monthStart))
  );
  const fitness = scoreFitness(
    raw.workouts.filter((w) => inWindow(w.date, weekStart)),
    raw.sleepLogs.filter((s) => inWindow(s.date, weekStart))
  );
  const mind = scoreMind(
    raw.medLogs.filter((m) => inWindow(m.date, monthStart)),
    raw.journal.filter((j) => inWindow(j.date, weekStart)),
    ref
  );
  const business = scoreBusiness(
    raw.goals.filter((g) => createdBy(g.createdAt)),
    raw.tasks.filter((t) => createdBy(t.createdAt)),
    endEx
  );
  const discipline = scoreDiscipline(
    raw.habits.filter((h) => createdBy(h.createdAt)),
    raw.checkIns.filter((c) => inWindow(c.date, weekStart))
  );
  const people = scorePeople(
    raw.interactions.filter((i) => inWindow(i.date, monthStart)),
    raw.contacts.filter((c) => createdBy(c.createdAt)),
    ref
  );

  return { finance, fitness, mind, business, discipline, people };
}

function scoresOf(modules: Record<ModuleKey, ModuleResult>): number[] {
  return Object.values(modules)
    .map((m) => m.score)
    .filter((s): s is number => s !== null);
}

function lifeScoreFrom(modules: Record<ModuleKey, ModuleResult>): number {
  const scored = scoresOf(modules);
  return scored.length ? clamp(avg(scored)) : 0;
}

// ---------- per-module scoring ----------

function scoreFinance(tx: { type: string; amount: number }[]): ModuleResult {
  let income = 0;
  let expenses = 0;
  for (const t of tx) {
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") expenses += t.amount;
  }

  if (tx.length === 0) {
    return { key: "finance", score: null, status: "No transactions in the last 30 days" };
  }

  if (income > 0) {
    const rate = (income - expenses) / income; // savings rate
    const pct = Math.round(rate * 100);
    // 40% saved => 100 points, 0% => 0, negative => 0
    return {
      key: "finance",
      score: clamp(rate * 250),
      status: `${pct}% of income saved (30 days)`,
    };
  }

  return {
    key: "finance",
    score: 40,
    status: "Spending tracked — add income to score it",
  };
}

function scoreFitness(
  workouts: { date: Date }[],
  sleep: { hours: number }[]
): ModuleResult {
  const workoutCount = workouts.length;
  const hasSleep = sleep.length > 0;
  const avgSleep = hasSleep ? avg(sleep.map((s) => s.hours)) : null;

  if (workoutCount === 0 && !hasSleep) {
    return { key: "fitness", score: null, status: "No workouts or sleep logged" };
  }

  const workoutScore = clamp((workoutCount / 4) * 100); // 4/week = full
  const parts = [workoutScore];
  if (avgSleep !== null) {
    // 7.5h = ideal (100); each hour away loses 20 points
    parts.push(clamp(100 - Math.abs(avgSleep - 7.5) * 20));
  }

  const sleepNote = avgSleep !== null ? `, avg ${avgSleep.toFixed(1)}h sleep` : "";
  return {
    key: "fitness",
    score: clamp(avg(parts)),
    status: `${workoutCount} workout${workoutCount === 1 ? "" : "s"} this week${sleepNote}`,
  };
}

function scoreMind(
  medLogs: { date: Date }[],
  journal: { mood: number }[],
  ref: Date
): ModuleResult {
  // Meditation streak: consecutive days up to the reference day.
  const medDays = new Set(medLogs.map((m) => dayKey(new Date(m.date))));
  let streak = 0;
  const cursor = new Date(ref);
  while (medDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const weekStart = addDays(ref, -6);
  const med7 = medLogs.filter((m) => new Date(m.date) >= weekStart);
  const medDaysThisWeek = new Set(med7.map((m) => dayKey(new Date(m.date)))).size;

  const hasMood = journal.length > 0;
  const moodAvg = hasMood ? avg(journal.map((j) => j.mood)) : null;

  if (med7.length === 0 && !hasMood) {
    return { key: "mind", score: null, status: "Log meditation or a journal entry" };
  }

  const parts: number[] = [clamp((medDaysThisWeek / 7) * 100)];
  if (moodAvg !== null) parts.push(clamp((moodAvg / 5) * 100)); // mood is 1-5

  let status: string;
  if (streak > 0) {
    status = `${streak}-day meditation streak`;
  } else if (moodAvg !== null) {
    status = `Average mood ${moodAvg.toFixed(1)}/5 this week`;
  } else {
    status = `${medDaysThisWeek} day${medDaysThisWeek === 1 ? "" : "s"} meditated this week`;
  }

  return { key: "mind", score: clamp(avg(parts)), status };
}

function scoreBusiness(
  goals: { status: string; progress: number; completedAt: Date | null }[],
  tasks: { status: string }[],
  endEx: Date
): ModuleResult {
  const done = tasks.filter((t) => t.status === "done" || t.status === "completed");
  const pending = tasks.filter(
    (t) => t.status !== "done" && t.status !== "completed"
  );

  if (goals.length === 0 && tasks.length === 0) {
    return { key: "business", score: null, status: "No goals or tasks yet" };
  }

  // A goal counts as completed "as of" the reference day only when its
  // completedAt timestamp falls before the end of that day. This makes the
  // historical trend step up on the day each goal was actually finished,
  // instead of showing today's status for every past day.
  const completedByThen = (g: { completedAt: Date | null }) =>
    g.completedAt !== null && new Date(g.completedAt) < endEx;

  const parts: number[] = [];
  if (goals.length) {
    // Each goal contributes 100 once completed (by this day), otherwise its
    // current progress as partial credit.
    const goalScore = avg(
      goals.map((g) => (completedByThen(g) ? 100 : clamp(g.progress)))
    );
    parts.push(clamp(goalScore));
  }
  if (tasks.length) parts.push(clamp((done.length / tasks.length) * 100));

  const completedCount = goals.filter(completedByThen).length;
  const status = goals.length
    ? `${completedCount}/${goals.length} goal${goals.length === 1 ? "" : "s"} completed${
        pending.length ? `, ${pending.length} task${pending.length === 1 ? "" : "s"} pending` : ""
      }`
    : `${pending.length} task${pending.length === 1 ? "" : "s"} pending`;

  return { key: "business", score: clamp(avg(parts)), status };
}

function scoreDiscipline(
  habits: { id: string; frequency: string }[],
  checkIns: { habitId: string }[]
): ModuleResult {
  if (habits.length === 0) {
    return { key: "discipline", score: null, status: "Add a habit to start tracking" };
  }

  // Expected check-ins this week per habit (daily = 7, weekly = 1, else 7).
  let expected = 0;
  let actual = 0;
  for (const h of habits) {
    const perHabit = h.frequency === "weekly" ? 1 : 7;
    expected += perHabit;
    const got = checkIns.filter((c) => c.habitId === h.id).length;
    actual += Math.min(got, perHabit); // cap so extra check-ins don't overflow
  }

  const rate = expected > 0 ? actual / expected : 0;
  const pct = Math.round(rate * 100);
  return {
    key: "discipline",
    score: clamp(rate * 100),
    status: `${pct}% of habits done this week`,
  };
}

function scorePeople(
  interactions: { date: Date; contactId: string }[],
  contacts: { id: string; name: string; priority: string }[],
  ref: Date
): ModuleResult {
  if (contacts.length === 0) {
    return { key: "people", score: null, status: "Add a contact to nurture" };
  }

  const weekStart = addDays(ref, -6);
  const interactions7 = interactions.filter((i) => new Date(i.date) >= weekStart);

  // Find a high-priority contact not reached in the last 14 days.
  const fourteenAgo = addDays(ref, -13);
  const recentContactIds = new Set(
    interactions
      .filter((i) => new Date(i.date) >= fourteenAgo)
      .map((i) => i.contactId)
  );
  const overdue = contacts.find(
    (c) => c.priority === "high" && !recentContactIds.has(c.id)
  );

  // Target ~3 meaningful interactions a week.
  const score = clamp((interactions7.length / 3) * 100);

  const status = overdue
    ? `Reach out to ${overdue.name} — overdue`
    : `${interactions7.length} interaction${interactions7.length === 1 ? "" : "s"} this week`;

  return { key: "people", score, status };
}

// ---------- daily brief (rules-based, targets the weakest module) ----------

const LABELS: Record<ModuleKey, string> = {
  finance: "Finance",
  fitness: "Fitness",
  mind: "Mind",
  business: "Business",
  discipline: "Discipline",
  people: "People",
};

function buildBrief(
  modules: Record<ModuleKey, ModuleResult>,
  lifeScore: number
): string {
  const tracked = (Object.values(modules) as ModuleResult[]).filter(
    (m) => m.score !== null
  );

  if (tracked.length === 0) {
    return "No data yet. Start logging in any module — finance, fitness, mind, business, discipline, or people — and this brief will come alive with your real numbers.";
  }

  const sorted = [...tracked].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const parts: string[] = [];

  if (lifeScore >= 75) parts.push(`Strong day — your Life Score is ${lifeScore}.`);
  else if (lifeScore >= 50) parts.push(`Steady day — your Life Score is ${lifeScore}.`);
  else parts.push(`Tough day — your Life Score is ${lifeScore}, but it's fixable.`);

  if (best.score !== null) {
    parts.push(`${LABELS[best.key]} is leading at ${best.score} (${best.status.toLowerCase()}).`);
  }

  if (worst.key !== best.key && worst.score !== null) {
    parts.push(`${LABELS[worst.key]} is your weakest right now — ${worst.status.toLowerCase()}.`);
  }

  // The smartest single next step comes from the weakest tracked module,
  // tailored to its real status and the time of day.
  const tip = smartTip(worst, new Date().getHours());
  if (tip) parts.push(tip);

  return parts.join(" ");
}

function smartTip(worst: ModuleResult, hour: number): string | null {
  const morning = hour < 12;
  const evening = hour >= 18;
  const status = worst.status.toLowerCase();

  switch (worst.key) {
    case "fitness": {
      if (status.startsWith("0 workout"))
        return morning
          ? "Best move today: fit in a 30-minute workout — even a brisk walk counts."
          : "Best move today: a short 30-minute workout before the day ends.";
      if (status.includes("sleep"))
        return "Aim for ~7.5 hours of sleep tonight to lift this fastest.";
      return "One more workout this week is the single biggest lift here.";
    }
    case "people": {
      if (status.startsWith("reach out"))
        return `Smartest step: send a quick message now — ${worst.status.replace(/^Reach out to /i, "").replace(/ — overdue$/i, "")} is overdue.`;
      return "A quick message to one person closes the gap fast.";
    }
    case "mind":
      return evening
        ? "Before bed, 5 minutes of meditation or a journal entry keeps momentum."
        : "Even 5 minutes of meditation now keeps your streak alive.";
    case "finance":
      return "Log today's spending so the savings number stays accurate.";
    case "discipline":
      return morning
        ? "Knock out your habits early — check one off now to set the tone."
        : "Check off any remaining habits before the day closes.";
    case "business":
      return "Pick the one pending task that matters most and finish it today.";
    default:
      return null;
  }
}

/** Safe, never-throwing default used when there is no user or a query fails. */
function safeDefault(): DashboardData {
  const empty = (key: ModuleKey): ModuleResult => ({
    key,
    score: null,
    status: "No data yet",
  });
  return {
    lifeScore: 0,
    modules: {
      finance: empty("finance"),
      fitness: empty("fitness"),
      mind: empty("mind"),
      business: empty("business"),
      discipline: empty("discipline"),
      people: empty("people"),
    },
    trend: [],
    brief: "Welcome to LifeOS. Start logging your data!",
  };
}
