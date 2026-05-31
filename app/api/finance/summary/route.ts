import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function monthBounds(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const prevMonthDate = new Date(currentYear, currentMonth - 2, 1);
  const prevMonth = prevMonthDate.getMonth() + 1;
  const prevYear = prevMonthDate.getFullYear();

  const { start: curStart, end: curEnd } = monthBounds(currentYear, currentMonth);
  const { start: prevStart, end: prevEnd } = monthBounds(prevYear, prevMonth);

  const [curTx, prevTx, budgets] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: curStart, lt: curEnd } },
      orderBy: { date: "desc" },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: prevStart, lt: prevEnd } },
    }),
    prisma.budget.findMany({
      where: { userId, month: currentMonth, year: currentYear },
    }),
  ]);

  let income = 0;
  let expenses = 0;
  const byCategory = new Map<string, number>();
  for (const t of curTx) {
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") {
      expenses += t.amount;
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
    }
  }

  let prevExpenses = 0;
  for (const t of prevTx) {
    if (t.type === "expense") prevExpenses += t.amount;
  }

  const savings = income - expenses;
  const savingsRate = income > 0 ? savings / income : 0;

  const topCategories = Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      share: expenses > 0 ? Math.round((amount / expenses) * 1000) / 10 : 0,
    }));

  const budgetVsActual = budgets.map((b) => {
    const spent =
      b.category === "All"
        ? expenses
        : byCategory.get(b.category) ?? 0;
    const remaining = b.amount - spent;
    return {
      category: b.category,
      budget: Math.round(b.amount * 100) / 100,
      actual: Math.round(spent * 100) / 100,
      remaining: Math.round(remaining * 100) / 100,
      pctUsed: b.amount > 0 ? Math.round((spent / b.amount) * 1000) / 10 : 0,
      over: spent > b.amount && b.amount > 0,
    };
  });

  let trend: "increasing" | "decreasing" | "flat" = "flat";
  let trendPct = 0;
  if (prevExpenses > 0) {
    trendPct = Math.round(((expenses - prevExpenses) / prevExpenses) * 1000) / 10;
    if (trendPct > 5) trend = "increasing";
    else if (trendPct < -5) trend = "decreasing";
    else trend = "flat";
  } else if (expenses > 0) {
    trend = "increasing";
    trendPct = 100;
  }

  const unusualTransactions = curTx
    .filter((t) => {
      if (t.type !== "expense") return false;
      const budget = budgets.find((b) => b.category === t.category);
      const allBudget = budgets.find((b) => b.category === "All");
      const reference = budget?.amount ?? allBudget?.amount ?? 0;
      return reference > 0 && t.amount > 0.2 * reference;
    })
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      amount: t.amount,
      category: t.category,
      description: t.description,
      date: t.date,
      reason: "Single transaction exceeds 20% of budget",
    }));

  return NextResponse.json({
    month: currentMonth,
    year: currentYear,
    generatedAt: new Date().toISOString(),
    summary: {
      income: Math.round(income * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      savingsRate: Math.round(savingsRate * 1000) / 10,
      transactionCount: curTx.length,
    },
    topCategories,
    budgetVsActual,
    trend: {
      direction: trend,
      changePct: trendPct,
      currentMonthExpenses: Math.round(expenses * 100) / 100,
      previousMonthExpenses: Math.round(prevExpenses * 100) / 100,
    },
    unusualTransactions,
  });
}
