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

  const screenTimeLogs = await prisma.screenTimeLog.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ screenTimeLogs });
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

  const { minutes, app, date } = (body ?? {}) as {
    minutes?: unknown;
    app?: unknown;
    date?: unknown;
  };

  const cleanApp = typeof app === "string" ? app.trim() : "";
  if (!cleanApp) {
    return NextResponse.json({ error: "App is required" }, { status: 400 });
  }

  const minutesNum = Number(minutes);
  if (!Number.isFinite(minutesNum) || minutesNum <= 0 || minutesNum > 1440) {
    return NextResponse.json({ error: "Minutes must be 1-1440" }, { status: 400 });
  }

  const parsedDate = date ? new Date(date as string) : new Date();
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const screenTimeLog = await prisma.screenTimeLog.create({
    data: {
      userId,
      app: cleanApp,
      minutes: Math.trunc(minutesNum),
      date: parsedDate,
    },
  });

  return NextResponse.json({ screenTimeLog }, { status: 201 });
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

  const result = await prisma.screenTimeLog.deleteMany({
    where: { id, userId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
