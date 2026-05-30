import { prisma } from "@/lib/prisma";

/**
 * Real dashboard engine for LifeOS.
 *
 * Reads the user's actual data from every module and turns it into:
 *  - a score (0-100) per module
 *  - one overall Life Score
 *  - a short, human status line per module
 *  - a data-driven "daily brief" (no AI key needed)
 *
 * Everything here is plain rules + math on real database rows.
 * When an AI model is added later, it can reuse this same data.
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

export interface DashboardData {
  lifeScore: number;
  modules: Record<ModuleKey, ModuleResult>;
  brief: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const avg = (nums: number[]) =>
  nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export async function getDashboardData(email: string): Promise<DashboardData> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return emptyDashboard();
  }
  const userId = user.id;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(startOfToday);
  weekAgo.setDate(weekAgo.getDate() - 6); // last 7 days, including today
  const thirtyAgo = new Date(startOfToday);
  thirtyAgo.setDate(thirtyAgo.getDate() - 29);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Pull everything we need in parallel.
  const [
    monthTx,
    workouts,
    sleepLogs,
    medLogs30,
    journal7,
    habits,
    checkIns7,
    goals,
    tasks,
    interactions30,
    contacts,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.workout.findMany({
      where: { userId, date: { gte: weekAgo } },
    }),
    prisma.sleepLog.findMany({
      where: { userId, date: { gte: weekAgo } },
    }),
    prisma.meditationLog.findMany({
      where: { userId, date: { gte: thirtyAgo } },
      orderBy: { date: "desc" },
    }),
    prisma.journalEntry.findMany({
      where: { userId, date: { gte: weekAgo } },
    }),
    prisma.habit.findMany({ where: { userId } }),
    prisma.habitCheckIn.findMany({
      where: { userId, date: { gte: weekAgo } },
    }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.task.findMany({ where: { userId } }),
    prisma.interaction.findMany({
      where: { userId, date: { gte: thirtyAgo } },
      orderBy: { date: "desc" },
    }),
    prisma.contact.findMany({ where: { userId } }),
  ]);

  const finance = scoreFinance(monthTx);
  const fitness = scoreFitness(workouts, sleepLogs);
  const mind = scoreMind(medLogs30, journal7, startOfToday);
  const business = scoreBusiness(goals, tasks);
  const discipline = scoreDiscipline(habits, checkIns7);
  const people = scorePeople(interactions30, contacts, startOfToday);

  const modules: Record<ModuleKey, ModuleResult> = {
    finance,
    fitness,
    mind,
    business,
    discipline,
    people,
  };

  const scored = Object.values(modules)
    .map((m) => m.score)
    .filter((s): s is number => s !== null);
  const lifeScore = scored.length ? clamp(avg(scored)) : 0;

  return { lifeScore, modules, brief: buildBrief(modules, lifeScore) };
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
    return { key: "finance", score: null, status: "No transactions yet this month" };
  }

  if (income > 0) {
    const rate = (income - expenses) / income; // savings rate
    const pct = Math.round(rate * 100);
    // 40% saved => 100 points, 0% => 0, negative => 0
    return {
      key: "finance",
      score: clamp(rate * 250),
      status: `${pct}% of income saved this month`,
    };
  }

  return {
    key: "finance",
    score: 40,
    status: "Spending tracked — add income to score it",
  };
}

function scoreFitness(
  workouts: { id: string }[],
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

  const sleepNote =
    avgSleep !== null ? `, avg ${avgSleep.toFixed(1)}h sleep` : "";
  return {
    key: "fitness",
    score: clamp(avg(parts)),
    status: `${workoutCount} workout${workoutCount === 1 ? "" : "s"} this week${sleepNote}`,
  };
}

function scoreMind(
  medLogs30: { date: Date }[],
  journal7: { mood: number }[],
  startOfToday: Date
): ModuleResult {
  // Meditation streak: consecutive days up to today.
  const medDays = new Set(medLogs30.map((m) => dayKey(new Date(m.date))));
  let streak = 0;
  const cursor = new Date(startOfToday);
  while (medDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const med7 = medLogs30.filter((m) => {
    const d = new Date(m.date);
    const weekAgo = new Date(startOfToday);
    weekAgo.setDate(weekAgo.getDate() - 6);
    return d >= weekAgo;
  });
  const medDaysThisWeek = new Set(med7.map((m) => dayKey(new Date(m.date)))).size;

  const hasMood = journal7.length > 0;
  const moodAvg = hasMood ? avg(journal7.map((j) => j.mood)) : null;

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
  goals: { status: string; progress: number }[],
  tasks: { status: string }[]
): ModuleResult {
  const activeGoals = goals.filter((g) => g.status === "active");
  const done = tasks.filter((t) => t.status === "done" || t.status === "completed");
  const pending = tasks.filter(
    (t) => t.status !== "done" && t.status !== "completed"
  );

  if (goals.length === 0 && tasks.length === 0) {
    return { key: "business", score: null, status: "No goals or tasks yet" };
  }

  const parts: number[] = [];
  if (activeGoals.length) parts.push(clamp(avg(activeGoals.map((g) => g.progress))));
  if (tasks.length) parts.push(clamp((done.length / tasks.length) * 100));

  const status = pending.length
    ? `${pending.length} task${pending.length === 1 ? "" : "s"} pending, ${activeGoals.length} active goal${activeGoals.length === 1 ? "" : "s"}`
    : `${activeGoals.length} active goal${activeGoals.length === 1 ? "" : "s"}, all tasks done`;

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
  interactions30: { date: Date; contactId: string }[],
  contacts: { id: string; name: string; priority: string }[],
  startOfToday: Date
): ModuleResult {
  if (contacts.length === 0) {
    return { key: "people", score: null, status: "Add a contact to nurture" };
  }

  const weekAgo = new Date(startOfToday);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const interactions7 = interactions30.filter((i) => new Date(i.date) >= weekAgo);

  // Find a high-priority contact not reached in the last 14 days.
  const fourteenAgo = new Date(startOfToday);
  fourteenAgo.setDate(fourteenAgo.getDate() - 14);
  const recentContactIds = new Set(
    interactions30
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

// ---------- daily brief (rules-based, no AI yet) ----------

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

  if (lifeScore >= 75) parts.push(`Strong week — your Life Score is ${lifeScore}.`);
  else if (lifeScore >= 50) parts.push(`Steady week — your Life Score is ${lifeScore}.`);
  else parts.push(`Tough week — your Life Score is ${lifeScore}, but it's fixable.`);

  if (best.score !== null) {
    parts.push(`${LABELS[best.key]} is leading at ${best.score} (${best.status.toLowerCase()}).`);
  }

  if (worst.key !== best.key && worst.score !== null) {
    parts.push(`${LABELS[worst.key]} needs attention — ${worst.status.toLowerCase()}.`);
  }

  // One concrete next action from the weakest tracked area.
  const action = nextAction(worst);
  if (action) parts.push(action);

  return parts.join(" ");
}

function nextAction(worst: ModuleResult): string | null {
  switch (worst.key) {
    case "fitness":
      return "A 30-minute workout today would move it the most.";
    case "people":
      return "A quick message to one person closes the gap fast.";
    case "mind":
      return "Even 5 minutes of meditation keeps the streak alive.";
    case "finance":
      return "Logging today's spending keeps the picture accurate.";
    case "discipline":
      return "Check off one habit now to lift the weekly rate.";
    case "business":
      return "Knock out one pending task to build momentum.";
    default:
      return null;
  }
}

function emptyDashboard(): DashboardData {
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
    brief:
      "Welcome to LifeOS. Start logging in any module and your real Life Score will appear here.",
  };
}
