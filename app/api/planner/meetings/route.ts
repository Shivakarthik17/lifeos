import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_CATEGORIES = new Set(["work", "personal", "health", "family", "other"]);

const CATEGORY_COLORS: Record<string, string> = {
  work: "#7F77DD",
  personal: "#2DD4BF",
  health: "#34D399",
  family: "#F472B6",
  other: "#9AA3C7",
};

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
  const meetings = await prisma.meeting.findMany({
    where: { userId },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json({ meetings });
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

  const { title, description, location, date, startTime, endTime, reminderMin, category } =
    (body ?? {}) as {
      title?: unknown;
      description?: unknown;
      location?: unknown;
      date?: unknown;
      startTime?: unknown;
      endTime?: unknown;
      reminderMin?: unknown;
      category?: unknown;
    };

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (typeof date !== "string" || !date.trim()) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (typeof startTime !== "string" || !startTime.trim()) {
    return NextResponse.json({ error: "Start time is required" }, { status: 400 });
  }

  let categoryValue = "work";
  if (category !== undefined && category !== null && category !== "") {
    if (typeof category !== "string" || !VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    categoryValue = category;
  }

  let reminderValue = 30;
  if (reminderMin !== undefined && reminderMin !== null && reminderMin !== "") {
    const n = Number(reminderMin);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: "Invalid reminder" }, { status: 400 });
    }
    reminderValue = Math.round(n);
  }

  const meeting = await prisma.meeting.create({
    data: {
      userId,
      title: title.trim(),
      description:
        typeof description === "string" && description.trim() ? description.trim() : null,
      location: typeof location === "string" && location.trim() ? location.trim() : null,
      date: parsedDate,
      startTime: startTime.trim(),
      endTime: typeof endTime === "string" && endTime.trim() ? endTime.trim() : null,
      reminderMin: reminderValue,
      category: categoryValue,
      color: CATEGORY_COLORS[categoryValue] ?? "#7F77DD",
    },
  });

  return NextResponse.json({ meeting }, { status: 201 });
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

  const { id, title, description, location, date, startTime, endTime, reminderMin, category } =
    (body ?? {}) as {
      id?: unknown;
      title?: unknown;
      description?: unknown;
      location?: unknown;
      date?: unknown;
      startTime?: unknown;
      endTime?: unknown;
      reminderMin?: unknown;
      category?: unknown;
    };

  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Invalid title" }, { status: 400 });
    }
    data.title = title.trim();
  }
  if (description !== undefined) {
    data.description =
      typeof description === "string" && description.trim() ? description.trim() : null;
  }
  if (location !== undefined) {
    data.location = typeof location === "string" && location.trim() ? location.trim() : null;
  }
  if (date !== undefined) {
    const parsed = new Date(date as string);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    data.date = parsed;
  }
  if (startTime !== undefined) {
    if (typeof startTime !== "string" || !startTime.trim()) {
      return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
    }
    data.startTime = startTime.trim();
  }
  if (endTime !== undefined) {
    data.endTime = typeof endTime === "string" && endTime.trim() ? endTime.trim() : null;
  }
  if (reminderMin !== undefined) {
    const n = Number(reminderMin);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: "Invalid reminder" }, { status: 400 });
    }
    data.reminderMin = Math.round(n);
  }
  if (category !== undefined) {
    if (typeof category !== "string" || !VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    data.category = category;
    data.color = CATEGORY_COLORS[category] ?? "#7F77DD";
  }

  const result = await prisma.meeting.updateMany({ where: { id, userId }, data });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const meeting = await prisma.meeting.findUnique({ where: { id } });
  return NextResponse.json({ meeting });
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
  const result = await prisma.meeting.deleteMany({ where: { id, userId } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
