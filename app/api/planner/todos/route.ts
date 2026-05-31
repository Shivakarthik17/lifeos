import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_PRIORITIES = new Set(["high", "medium", "low"]);
const VALID_CATEGORIES = new Set(["work", "personal", "health", "family", "other"]);

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
  // Incomplete first, then completed. Within each group, most recent first.
  const todos = await prisma.todoItem.findMany({
    where: { userId },
    orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ todos });
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

  const { title, description, priority, category, dueDate, dueTime } = (body ?? {}) as {
    title?: unknown;
    description?: unknown;
    priority?: unknown;
    category?: unknown;
    dueDate?: unknown;
    dueTime?: unknown;
  };

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  let priorityValue = "medium";
  if (priority !== undefined && priority !== null && priority !== "") {
    if (typeof priority !== "string" || !VALID_PRIORITIES.has(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    priorityValue = priority;
  }

  let categoryValue = "personal";
  if (category !== undefined && category !== null && category !== "") {
    if (typeof category !== "string" || !VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    categoryValue = category;
  }

  let parsedDate: Date | null = null;
  if (typeof dueDate === "string" && dueDate.trim()) {
    parsedDate = new Date(dueDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
    }
  }

  const todo = await prisma.todoItem.create({
    data: {
      userId,
      title: title.trim(),
      description:
        typeof description === "string" && description.trim() ? description.trim() : null,
      priority: priorityValue,
      category: categoryValue,
      dueDate: parsedDate,
      dueTime: typeof dueTime === "string" && dueTime.trim() ? dueTime.trim() : null,
    },
  });

  return NextResponse.json({ todo }, { status: 201 });
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

  const { id, title, description, priority, category, dueDate, dueTime, completed } =
    (body ?? {}) as {
      id?: unknown;
      title?: unknown;
      description?: unknown;
      priority?: unknown;
      category?: unknown;
      dueDate?: unknown;
      dueTime?: unknown;
      completed?: unknown;
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
  if (priority !== undefined) {
    if (typeof priority !== "string" || !VALID_PRIORITIES.has(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    data.priority = priority;
  }
  if (category !== undefined) {
    if (typeof category !== "string" || !VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    data.category = category;
  }
  if (dueDate !== undefined) {
    if (dueDate === null || dueDate === "") {
      data.dueDate = null;
    } else {
      const parsed = new Date(dueDate as string);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
      }
      data.dueDate = parsed;
    }
  }
  if (dueTime !== undefined) {
    data.dueTime = typeof dueTime === "string" && dueTime.trim() ? dueTime.trim() : null;
  }
  if (completed !== undefined) {
    if (typeof completed !== "boolean") {
      return NextResponse.json({ error: "Invalid completed value" }, { status: 400 });
    }
    data.completed = completed;
    data.completedAt = completed ? new Date() : null;
  }

  const result = await prisma.todoItem.updateMany({ where: { id, userId }, data });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const todo = await prisma.todoItem.findUnique({ where: { id } });
  return NextResponse.json({ todo });
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
  const result = await prisma.todoItem.deleteMany({ where: { id, userId } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
