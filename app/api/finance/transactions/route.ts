import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_TYPES = new Set(["income", "expense"]);

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

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ transactions });
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

  const { amount, category, description, type, date } = (body ?? {}) as {
    amount?: unknown;
    category?: unknown;
    description?: unknown;
    type?: unknown;
    date?: unknown;
  };

  const amountNum = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (typeof category !== "string" || !category.trim()) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (typeof type !== "string" || !VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const parsedDate = date ? new Date(date as string) : new Date();
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      amount: amountNum,
      category: category.trim(),
      description: typeof description === "string" && description.trim() ? description.trim() : null,
      type,
      date: parsedDate,
    },
  });

  return NextResponse.json({ transaction }, { status: 201 });
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

  const result = await prisma.transaction.deleteMany({
    where: { id, userId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
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

  const { id, category, description, amount, type, date } = (body ?? {}) as {
    id?: unknown;
    category?: unknown;
    description?: unknown;
    amount?: unknown;
    type?: unknown;
    date?: unknown;
  };

  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  if (typeof category !== "string" || !category.trim()) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (description !== undefined && description !== null && typeof description !== "string") {
    return NextResponse.json({ error: "Invalid description" }, { status: 400 });
  }

  const data: {
    category: string;
    description: string | null;
    amount?: number;
    type?: string;
    date?: Date;
  } = {
    category: category.trim(),
    description:
      typeof description === "string" && description.trim()
        ? description.trim()
        : null,
  };

  if (amount !== undefined) {
    const amountNum = typeof amount === "number" ? amount : Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    data.amount = amountNum;
  }

  if (type !== undefined) {
    if (typeof type !== "string" || !VALID_TYPES.has(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    data.type = type;
  }

  if (date !== undefined) {
    const parsedDate = new Date(date as string);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    data.date = parsedDate;
  }

  const result = await prisma.transaction.updateMany({
    where: { id, userId },
    data,
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  return NextResponse.json({ transaction });
}
