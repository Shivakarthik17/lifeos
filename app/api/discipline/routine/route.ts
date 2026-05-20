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
  const routines = await prisma.dailyRoutine.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ routines });
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

  const { date, wakeTime, sleepTime, rating, notes } = (body ?? {}) as {
    date?: unknown;
    wakeTime?: unknown;
    sleepTime?: unknown;
    rating?: unknown;
    notes?: unknown;
  };

  const parsedDate = date ? new Date(date as string) : new Date();
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  let ratingValue = 5;
  if (rating !== undefined && rating !== null && rating !== "") {
    const n = Number(rating);
    if (!Number.isFinite(n) || n < 1 || n > 10) {
      return NextResponse.json({ error: "Rating must be 1-10" }, { status: 400 });
    }
    ratingValue = Math.trunc(n);
  }

  const dayStart = new Date(parsedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const existing = await prisma.dailyRoutine.findFirst({
    where: { userId, date: { gte: dayStart, lt: dayEnd } },
  });

  const payload = {
    wakeTime: typeof wakeTime === "string" && wakeTime.trim() ? wakeTime.trim() : null,
    sleepTime: typeof sleepTime === "string" && sleepTime.trim() ? sleepTime.trim() : null,
    rating: ratingValue,
    notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
  };

  if (existing) {
    const updated = await prisma.dailyRoutine.update({
      where: { id: existing.id },
      data: payload,
    });
    return NextResponse.json({ routine: updated });
  }

  const routine = await prisma.dailyRoutine.create({
    data: { userId, date: parsedDate, ...payload },
  });
  return NextResponse.json({ routine }, { status: 201 });
}
