"use client";

import { useState } from "react";

export default function Hero() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success">("idle");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("success");
    setEmail("");
  }

  return (
    <section className="relative overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-hero-radial" aria-hidden="true" />

      <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-20 text-center sm:pt-28 md:pb-32 md:pt-36">
        <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          <span className="h-2 w-2 rounded-full bg-accent shadow-glow" />
          Now in private beta
        </span>

        <h1 className="mt-6 animate-fade-up text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          Build the best{" "}
          <span className="bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
            version of yourself
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl animate-fade-up text-pretty text-base text-muted sm:text-lg md:text-xl">
          LifeOS is your personal operating system for discipline. Track Finance, Fitness,
          Mind, Business, Daily Habits, and People — all in one place.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-10 flex w-full max-w-md animate-fade-up flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="hero-email" className="sr-only">
            Email address
          </label>
          <input
            id="hero-email"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full flex-1 rounded-full border border-border bg-surface px-5 py-3 text-sm text-white placeholder:text-muted transition-colors focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-glow"
          >
            Join the Waitlist
          </button>
        </form>

        {status === "success" && (
          <p className="mt-4 animate-fade-up text-sm text-accent">
            You&apos;re on the list — we&apos;ll be in touch soon.
          </p>
        )}

        <p className="mt-4 text-xs text-muted">
          No spam. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
}
