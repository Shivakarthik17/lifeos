"use client";

import { useRef, useState } from "react";

interface Message {
  role: "user" | "coach";
  text: string;
}

const SUGGESTIONS = [
  "How was my week?",
  "What should I focus on today?",
  "Where am I doing well?",
];

export default function AICoach() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;

    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      const answer =
        data?.answer ?? "Sorry, I couldn't answer that. Please try again.";
      setMessages((m) => [...m, { role: "coach", text: answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "coach", text: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
      // Scroll to the newest message.
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      });
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-border/60 bg-gradient-to-br from-surface to-surface-2 p-6 shadow-card">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </span>
        <h2 className="text-base font-semibold text-white">Ask your AI coach</h2>
      </div>

      {messages.length > 0 && (
        <div
          ref={listRef}
          className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-accent/90 px-4 py-2 text-sm text-white"
                    : "max-w-[85%] rounded-2xl rounded-bl-sm border border-border/60 bg-surface/80 px-4 py-2 text-sm leading-relaxed text-muted"
                }
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-border/60 bg-surface/80 px-4 py-2 text-sm text-muted">
                Thinking…
              </div>
            </div>
          )}
        </div>
      )}

      {messages.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={loading}
              className="rounded-full border border-border/60 bg-surface/60 px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/50 hover:text-white disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="mt-4 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your life data…"
          disabled={loading}
          className="flex-1 rounded-xl border border-border/60 bg-surface/60 px-4 py-2.5 text-sm text-white placeholder:text-muted focus:border-accent/60 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          Send
        </button>
      </form>

      <p className="mt-3 text-xs text-muted">
        Powered by Google Gemini. Your real LifeOS data is shared with the AI to
        answer.
      </p>
    </section>
  );
}
