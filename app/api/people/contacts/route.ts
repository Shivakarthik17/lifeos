import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_RELATIONSHIPS = new Set([
  "Family",
  "Friend",
  "Colleague",
  "Mentor",
  "Business",
  "Acquaintance",
]);
const VALID_PRIORITIES = new Set(["High", "Medium", "Low"]);

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
  const contacts = await prisma.contact.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      interactions: {
        orderBy: { date: "desc" },
        take: 1,
        select: { date: true },
      },
    },
  });
  return NextResponse.json({ contacts });
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

  const { name, relationship, phone, email, notes, priority } = (body ?? {}) as {
    name?: unknown;
    relationship?: unknown;
    phone?: unknown;
    email?: unknown;
    notes?: unknown;
    priority?: unknown;
  };

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (typeof relationship !== "string" || !VALID_RELATIONSHIPS.has(relationship)) {
    return NextResponse.json({ error: "Invalid relationship" }, { status: 400 });
  }

  let priorityValue = "Medium";
  if (priority !== undefined && priority !== null && priority !== "") {
    if (typeof priority !== "string" || !VALID_PRIORITIES.has(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    priorityValue = priority;
  }

  const contact = await prisma.contact.create({
    data: {
      userId,
      name: name.trim(),
      relationship,
      phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
      email: typeof email === "string" && email.trim() ? email.trim() : null,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      priority: priorityValue,
    },
  });

  return NextResponse.json({ contact }, { status: 201 });
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

  const { id, name, relationship, phone, email, notes, priority } = (body ?? {}) as {
    id?: unknown;
    name?: unknown;
    relationship?: unknown;
    phone?: unknown;
    email?: unknown;
    notes?: unknown;
    priority?: unknown;
  };

  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    data.name = name.trim();
  }
  if (relationship !== undefined) {
    if (typeof relationship !== "string" || !VALID_RELATIONSHIPS.has(relationship)) {
      return NextResponse.json({ error: "Invalid relationship" }, { status: 400 });
    }
    data.relationship = relationship;
  }
  if (phone !== undefined) {
    data.phone = typeof phone === "string" && phone.trim() ? phone.trim() : null;
  }
  if (email !== undefined) {
    data.email = typeof email === "string" && email.trim() ? email.trim() : null;
  }
  if (notes !== undefined) {
    data.notes = typeof notes === "string" && notes.trim() ? notes.trim() : null;
  }
  if (priority !== undefined) {
    if (typeof priority !== "string" || !VALID_PRIORITIES.has(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    data.priority = priority;
  }

  const result = await prisma.contact.updateMany({ where: { id, userId }, data });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const contact = await prisma.contact.findUnique({ where: { id } });
  return NextResponse.json({ contact });
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
  const result = await prisma.contact.deleteMany({ where: { id, userId } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
