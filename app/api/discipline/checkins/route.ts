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

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const checkIns = await prisma.habitCheckIn.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ checkIns });
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

  const { habitId, date, toggle } = (body ?? {}) as {
    habitId?: unknown;
    date?: unknown;
    toggle?: unknown;
  };

  if (typeof habitId !== "string" || !habitId) {
    return NextResponse.json({ error: "habitId is required" }, { status: 400 });
  }

  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  const parsedDate = date ? new Date(date as string) : new Date();
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const dayStart = new Date(parsedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const existing = await prisma.habitCheckIn.findFirst({
    where: {
      habitId,
      userId,
      date: { gte: dayStart, lt: dayEnd },
    },
  });

  if (existing) {
    if (toggle === false) {
      return NextResponse.json({ checkIn: existing });
    }
    await prisma.habitCheckIn.delete({ where: { id: existing.id } });
    return NextResponse.json({ removed: true });
  }

  const checkIn = await prisma.habitCheckIn.create({
    data: { habitId, userId, date: parsedDate },
  });
  return NextResponse.json({ checkIn }, { status: 201 });
}
