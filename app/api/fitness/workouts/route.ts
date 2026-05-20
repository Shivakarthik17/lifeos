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

type ExerciseInput = {
  name?: unknown;
  sets?: unknown;
  reps?: unknown;
  weight?: unknown;
};

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workouts = await prisma.workout.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ workouts });
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

  const { exercises, duration, notes, date } = (body ?? {}) as {
    exercises?: unknown;
    duration?: unknown;
    notes?: unknown;
    date?: unknown;
  };

  if (!Array.isArray(exercises) || exercises.length === 0) {
    return NextResponse.json({ error: "At least one exercise is required" }, { status: 400 });
  }

  const cleanExercises = [] as Array<{ name: string; sets: number; reps: number; weight: number }>;
  for (const raw of exercises as ExerciseInput[]) {
    const name = typeof raw?.name === "string" ? raw.name.trim() : "";
    const sets = Number(raw?.sets);
    const reps = Number(raw?.reps);
    const weight = Number(raw?.weight);
    if (!name) {
      return NextResponse.json({ error: "Exercise name is required" }, { status: 400 });
    }
    if (!Number.isFinite(sets) || sets < 0) {
      return NextResponse.json({ error: "Invalid sets" }, { status: 400 });
    }
    if (!Number.isFinite(reps) || reps < 0) {
      return NextResponse.json({ error: "Invalid reps" }, { status: 400 });
    }
    if (!Number.isFinite(weight) || weight < 0) {
      return NextResponse.json({ error: "Invalid weight" }, { status: 400 });
    }
    cleanExercises.push({ name, sets: Math.trunc(sets), reps: Math.trunc(reps), weight });
  }

  const durationNum = Number(duration);
  if (!Number.isFinite(durationNum) || durationNum <= 0) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  const parsedDate = date ? new Date(date as string) : new Date();
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const workout = await prisma.workout.create({
    data: {
      userId,
      exercises: cleanExercises,
      duration: Math.trunc(durationNum),
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      date: parsedDate,
    },
  });

  return NextResponse.json({ workout }, { status: 201 });
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

  const result = await prisma.workout.deleteMany({
    where: { id, userId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
