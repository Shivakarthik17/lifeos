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
  const challenges = await prisma.communicationChallenge.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ challenges });
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

  const { challenge, date, notes, completed } = (body ?? {}) as {
    challenge?: unknown;
    date?: unknown;
    notes?: unknown;
    completed?: unknown;
  };

  if (typeof challenge !== "string" || !challenge.trim()) {
    return NextResponse.json({ error: "Challenge is required" }, { status: 400 });
  }

  let parsedDate: Date = new Date();
  if (typeof date === "string" && date.trim()) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    parsedDate = d;
  }

  const newChallenge = await prisma.communicationChallenge.create({
    data: {
      userId,
      challenge: challenge.trim(),
      date: parsedDate,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      completed: completed === true,
    },
  });

  return NextResponse.json({ challenge: newChallenge }, { status: 201 });
}

export async function PATCH(req: Request) {
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

  const { id, completed, notes } = (body ?? {}) as {
    id?: unknown;
    completed?: unknown;
    notes?: unknown;
  };

  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (completed !== undefined) {
    if (typeof completed !== "boolean") {
      return NextResponse.json({ error: "Invalid completed" }, { status: 400 });
    }
    data.completed = completed;
  }
  if (notes !== undefined) {
    data.notes = typeof notes === "string" && notes.trim() ? notes.trim() : null;
  }

  const result = await prisma.communicationChallenge.updateMany({
    where: { id, userId },
    data,
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const challenge = await prisma.communicationChallenge.findUnique({ where: { id } });
  return NextResponse.json({ challenge });
}
