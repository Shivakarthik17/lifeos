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

  const journalEntries = await prisma.journalEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ journalEntries });
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

  const { content, mood, grateful, date } = (body ?? {}) as {
    content?: unknown;
    mood?: unknown;
    grateful?: unknown;
    date?: unknown;
  };

  const cleanContent = typeof content === "string" ? content.trim() : "";
  if (!cleanContent) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const moodNum = Number(mood);
  if (!Number.isInteger(moodNum) || moodNum < 1 || moodNum > 10) {
    return NextResponse.json({ error: "Mood must be 1-10" }, { status: 400 });
  }

  const parsedDate = date ? new Date(date as string) : new Date();
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const journalEntry = await prisma.journalEntry.create({
    data: {
      userId,
      content: cleanContent,
      mood: moodNum,
      grateful:
        typeof grateful === "string" && grateful.trim() ? grateful.trim() : null,
      date: parsedDate,
    },
  });

  return NextResponse.json({ journalEntry }, { status: 201 });
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

  const result = await prisma.journalEntry.deleteMany({
    where: { id, userId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
