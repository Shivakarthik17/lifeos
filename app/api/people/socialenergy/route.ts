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
  const logs = await prisma.socialEnergyLog.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ logs });
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

  const { energy, date, notes } = (body ?? {}) as {
    energy?: unknown;
    date?: unknown;
    notes?: unknown;
  };

  if (typeof energy !== "number" || !Number.isFinite(energy) || energy < 1 || energy > 10) {
    return NextResponse.json(
      { error: "Energy must be a number between 1 and 10" },
      { status: 400 }
    );
  }

  let parsedDate: Date = new Date();
  if (typeof date === "string" && date.trim()) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    parsedDate = d;
  }

  const log = await prisma.socialEnergyLog.create({
    data: {
      userId,
      energy: Math.round(energy),
      date: parsedDate,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
    },
  });

  return NextResponse.json({ log }, { status: 201 });
}
