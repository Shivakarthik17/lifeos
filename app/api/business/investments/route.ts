import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_TYPES = new Set([
  "Stocks",
  "Mutual Funds",
  "Gold",
  "FD",
  "Crypto",
  "Real Estate",
  "Other",
]);

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
  const investments = await prisma.investment.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ investments });
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

  const { name, type, amount, currentValue, date, notes } = (body ?? {}) as {
    name?: unknown;
    type?: unknown;
    amount?: unknown;
    currentValue?: unknown;
    date?: unknown;
    notes?: unknown;
  };

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (typeof type !== "string" || !VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  let currentNum: number | null = null;
  if (currentValue !== undefined && currentValue !== null && currentValue !== "") {
    const n = Number(currentValue);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: "Invalid current value" }, { status: 400 });
    }
    currentNum = n;
  }

  const parsedDate = date ? new Date(date as string) : new Date();
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const investment = await prisma.investment.create({
    data: {
      userId,
      name: name.trim(),
      type,
      amount: amountNum,
      currentValue: currentNum,
      date: parsedDate,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
    },
  });

  return NextResponse.json({ investment }, { status: 201 });
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

  const { id, name, type, amount, currentValue, date, notes } = (body ?? {}) as {
    id?: unknown;
    name?: unknown;
    type?: unknown;
    amount?: unknown;
    currentValue?: unknown;
    date?: unknown;
    notes?: unknown;
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
  if (type !== undefined) {
    if (typeof type !== "string" || !VALID_TYPES.has(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    data.type = type;
  }
  if (amount !== undefined) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    data.amount = n;
  }
  if (currentValue !== undefined) {
    if (currentValue === null || currentValue === "") {
      data.currentValue = null;
    } else {
      const n = Number(currentValue);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: "Invalid current value" }, { status: 400 });
      }
      data.currentValue = n;
    }
  }
  if (date !== undefined) {
    if (date === null || date === "") {
      // ignore
    } else {
      const parsed = new Date(date as string);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      }
      data.date = parsed;
    }
  }
  if (notes !== undefined) {
    data.notes = typeof notes === "string" && notes.trim() ? notes.trim() : null;
  }

  const result = await prisma.investment.updateMany({ where: { id, userId }, data });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const investment = await prisma.investment.findUnique({ where: { id } });
  return NextResponse.json({ investment });
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
  const result = await prisma.investment.deleteMany({ where: { id, userId } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
