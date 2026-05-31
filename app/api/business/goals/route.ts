import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_CATEGORIES = new Set(["Career", "Financial", "Personal", "Business", "Health"]);
const VALID_STATUSES = new Set(["active", "completed", "paused"]);

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
  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ goals });
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

  const { title, description, category, targetDate } = (body ?? {}) as {
    title?: unknown;
    description?: unknown;
    category?: unknown;
    targetDate?: unknown;
  };

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (typeof category !== "string" || !VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  let parsedDate: Date | null = null;
  if (typeof targetDate === "string" && targetDate.trim()) {
    parsedDate = new Date(targetDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid target date" }, { status: 400 });
    }
  }

  const goal = await prisma.goal.create({
    data: {
      userId,
      title: title.trim(),
      description: typeof description === "string" && description.trim() ? description.trim() : null,
      category,
      targetDate: parsedDate,
    },
  });

  return NextResponse.json({ goal }, { status: 201 });
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

  const { id, progress, status, title, description, category, targetDate } = (body ?? {}) as {
    id?: unknown;
    progress?: unknown;
    status?: unknown;
    title?: unknown;
    description?: unknown;
    category?: unknown;
    targetDate?: unknown;
  };

  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (progress !== undefined) {
    const n = Number(progress);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return NextResponse.json({ error: "Progress must be 0-100" }, { status: 400 });
    }
    data.progress = Math.trunc(n);
  }
  if (status !== undefined) {
    if (typeof status !== "string" || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = status;
    // Stamp completion time so the business trend can reflect when a goal
    // was actually finished; clear it if the goal is reopened.
    data.completedAt = status === "completed" ? new Date() : null;
  }
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Invalid title" }, { status: 400 });
    }
    data.title = title.trim();
  }
  if (description !== undefined) {
    data.description = typeof description === "string" && description.trim() ? description.trim() : null;
  }
  if (category !== undefined) {
    if (typeof category !== "string" || !VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    data.category = category;
  }
  if (targetDate !== undefined) {
    if (targetDate === null || targetDate === "") {
      data.targetDate = null;
    } else {
      const parsed = new Date(targetDate as string);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid target date" }, { status: 400 });
      }
      data.targetDate = parsed;
    }
  }

  const result = await prisma.goal.updateMany({ where: { id, userId }, data });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const goal = await prisma.goal.findUnique({ where: { id } });
  return NextResponse.json({ goal });
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
  const result = await prisma.goal.deleteMany({ where: { id, userId } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
