import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_TYPES = new Set(["Call", "Message", "Meeting", "Coffee", "Video Call"]);
const VALID_MOODS = new Set(["Good", "Neutral", "Awkward", "Great"]);

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
  const interactions = await prisma.interaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    include: {
      contact: { select: { id: true, name: true, relationship: true } },
    },
  });
  return NextResponse.json({ interactions });
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

  const { contactId, type, date, notes, mood } = (body ?? {}) as {
    contactId?: unknown;
    type?: unknown;
    date?: unknown;
    notes?: unknown;
    mood?: unknown;
  };

  if (typeof contactId !== "string" || !contactId) {
    return NextResponse.json({ error: "Contact is required" }, { status: 400 });
  }
  if (typeof type !== "string" || !VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  let parsedDate: Date = new Date();
  if (typeof date === "string" && date.trim()) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    parsedDate = d;
  }

  let moodValue: string | null = null;
  if (mood !== undefined && mood !== null && mood !== "") {
    if (typeof mood !== "string" || !VALID_MOODS.has(mood)) {
      return NextResponse.json({ error: "Invalid mood" }, { status: 400 });
    }
    moodValue = mood;
  }

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId },
    select: { id: true },
  });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const interaction = await prisma.interaction.create({
    data: {
      userId,
      contactId,
      type,
      date: parsedDate,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      mood: moodValue,
    },
  });

  return NextResponse.json({ interaction }, { status: 201 });
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
  const result = await prisma.interaction.deleteMany({ where: { id, userId } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
