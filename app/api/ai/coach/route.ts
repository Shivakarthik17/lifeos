import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getDashboardData, type DashboardData } from "@/lib/dashboard";

/**
 * LifeOS AI Coach.
 *
 * Takes the user's question, gathers their REAL LifeOS data, and asks
 * Google Gemini (free tier) to answer like a personal life coach.
 *
 * Works only when GEMINI_API_KEY is set. Until then it returns a friendly
 * "not connected yet" message instead of failing.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Not configured yet — guide the user instead of crashing.
    return NextResponse.json({
      configured: false,
      answer:
        "The AI coach is not connected yet. Get a free key from Google AI Studio (aistudio.google.com), then add it as GEMINI_API_KEY in your environment. After that, ask me anything about your life data!",
    });
  }

  // Read the question safely.
  let question = "";
  try {
    const body = await req.json();
    question = String(body?.question ?? "").trim().slice(0, 1000);
  } catch {
    question = "";
  }
  if (!question) {
    return NextResponse.json(
      { error: "Please ask a question." },
      { status: 400 }
    );
  }

  // Gather the user's real LifeOS data (never throws — returns safe defaults).
  let data: DashboardData;
  try {
    data = await getDashboardData(session.user.email);
  } catch (error) {
    console.error("AI coach: failed to load data:", error);
    return NextResponse.json(
      { answer: "Sorry, I couldn't read your data right now. Please try again." },
      { status: 200 }
    );
  }

  const context = buildContext(data);

  const systemPrompt = [
    "You are the LifeOS Coach, a warm and encouraging personal life coach.",
    "You help the user improve across six areas: Finance, Fitness, Mind, Business, Discipline, and People.",
    "Use ONLY the user's data provided below. Do not invent numbers.",
    "If a module has no data, gently suggest they start logging it.",
    "Keep answers short (2-5 sentences), positive, and use simple, clear English.",
    "Give one concrete, doable next step when helpful.",
  ].join(" ");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const payload = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [
      {
        role: "user",
        parts: [{ text: `Here is my current LifeOS data:\n\n${context}\n\nMy question: ${question}` }],
      },
    ],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 800,
      // gemini-2.5-flash is a "thinking" model; disable thinking so the full
      // token budget goes to the visible coach reply.
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Gemini API error:", res.status, detail);
      return NextResponse.json(
        {
          answer:
            "The AI had a problem answering (check your API key and free-tier quota). Please try again in a moment.",
          error: true,
        },
        { status: 200 }
      );
    }

    const json = await res.json();
    const answer =
      json?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p?.text ?? "")
        .join("")
        .trim() || "I couldn't form an answer this time. Please try rephrasing.";

    return NextResponse.json({ configured: true, answer });
  } catch (error) {
    console.error("AI coach request failed:", error);
    return NextResponse.json(
      { answer: "Sorry, something went wrong reaching the AI. Please try again." },
      { status: 200 }
    );
  }
}

/** Turn the dashboard data into a short, readable summary for the AI. */
function buildContext(data: DashboardData): string {
  const lines: string[] = [];
  lines.push(`Overall Life Score: ${data.lifeScore}/100.`);

  const labels: Record<string, string> = {
    finance: "Finance",
    fitness: "Fitness",
    mind: "Mind",
    business: "Business",
    discipline: "Discipline",
    people: "People",
  };

  lines.push("Module details:");
  for (const key of Object.keys(data.modules)) {
    const m = data.modules[key as keyof typeof data.modules];
    const score = m.score === null ? "no data" : `${m.score}/100`;
    lines.push(`- ${labels[key]}: ${score} — ${m.status}`);
  }

  const trendScores = data.trend
    .map((t) => (t.score === null ? "–" : String(t.score)))
    .join(", ");
  if (data.trend.length) {
    lines.push(`Life Score over the last 7 days (oldest to newest): ${trendScores}.`);
  }

  return lines.join("\n");
}
