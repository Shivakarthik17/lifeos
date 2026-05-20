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

  const calorieLogs = await prisma.calorieLog.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ calorieLogs });
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

  const { calories, meal, date } = (body ?? {}) as {
    calories?: unknown;
    meal?: unknown;
    date?: unknown;
  };

  const caloriesNum = Number(calories);
  if (!Number.isFinite(caloriesNum) || caloriesNum <= 0) {
    return NextResponse.json({ error: "Invalid calories" }, { status: 400 });
  }
  if (typeof meal !== "string" || !meal.trim()) {
    return NextResponse.json({ error: "Meal is required" }, { status: 400 });
  }

  const parsedDate = date ? new Date(date as string) : new Date();
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const calorieLog = await prisma.calorieLog.create({
    data: {
      userId,
      calories: Math.trunc(caloriesNum),
      meal: meal.trim(),
      date: parsedDate,
    },
  });

  return NextResponse.json({ calorieLog }, { status: 201 });
}

export async function DELETE(req: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const result = await prisma.calorieLog.deleteMany({
    where: { id, userId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
