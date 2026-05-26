import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const now = new Date();
  const month = Number(url.searchParams.get("month") ?? now.getMonth() + 1);
  const year = Number(url.searchParams.get("year") ?? now.getFullYear());

  const budgets = await prisma.budget.findMany({
    where: { userId, month, year },
    orderBy: { category: "asc" },
  });

  return NextResponse.json({ budgets, month, year });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { category, amount, month, year } = (body ?? {}) as {
    category?: unknown;
    amount?: unknown;
    month?: unknown;
    year?: unknown;
  };

  const VALID_CATEGORIES = new Set([
    "All",
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Health",
    "Entertainment",
    "Other",
  ]);
  if (typeof category !== "string" || !VALID_CATEGORIES.has(category.trim())) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  const amountNum = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(amountNum) || amountNum < 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  const now = new Date();
  const monthNum = month === undefined || month === null || month === ""
    ? now.getMonth() + 1
    : Number(month);
  const yearNum = year === undefined || year === null || year === ""
    ? now.getFullYear()
    : Number(year);
  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }
  if (!Number.isInteger(yearNum) || yearNum < 1970 || yearNum > 9999) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const trimmedCategory = category.trim();

  const existing = await prisma.budget.findFirst({
    where: { userId, category: trimmedCategory, month: monthNum, year: yearNum },
    select: { id: true },
  });

  const budget = existing
    ? await prisma.budget.update({
        where: { id: existing.id },
        data: { amount: amountNum },
      })
    : await prisma.budget.create({
        data: {
          userId,
          category: trimmedCategory,
          amount: amountNum,
          month: monthNum,
          year: yearNum,
        },
      });

  return NextResponse.json({ budget }, { status: existing ? 200 : 201 });
}
