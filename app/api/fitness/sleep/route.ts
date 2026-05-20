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

  const sleepLogs = await prisma.sleepLog.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ sleepLogs });
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

  const { hours, quality, date } = (body ?? {}) as {
    hours?: unknown;
    quality?: unknown;
    date?: unknown;
  };

  const hoursNum = Number(hours);
  if (!Number.isFinite(hoursNum) || hoursNum < 1 || hoursNum > 12) {
    return NextResponse.json({ error: "Hours must be between 1 and 12" }, { status: 400 });
  }
  const qualityNum = Number(quality);
  if (!Number.isInteger(qualityNum) || qualityNum < 1 || qualityNum > 5) {
    return NextResponse.json({ error: "Quality must be 1-5" }, { status: 400 });
  }

  const parsedDate = date ? new Date(date as string) : new Date();
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const sleepLog = await prisma.sleepLog.create({
    data: {
      userId,
      hours: hoursNum,
      quality: qualityNum,
      date: parsedDate,
    },
  });

  return NextResponse.json({ sleepLog }, { status: 201 });
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

  const result = await prisma.sleepLog.deleteMany({
    where: { id, userId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
