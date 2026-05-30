"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success">("idle");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("success");
    router.push("/login");
  }

  return (
    <section id="waitlist" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-accent/40 bg-gradient-to-br from-surface to-surface-2 px-6 py-14 text-center shadow-glow sm:px-12 sm:py-20">
          <div
            className="pointer-events-none absolute inset-0 bg-hero-radial opacity-70"
            aria-hidden="true"
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
              Limited spots · Early access pricing
            </span>

            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Become the most disciplined version of yourself
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted sm:text-lg">
              Join the waitlist and be the first to use LifeOS when it opens. Founding
              members lock in lifetime pricing.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row"
            >
              <label htmlFor="waitlist-email" className="sr-only">
                Email address
              </label>
              <input
                id="waitlist-email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full flex-1 rounded-full border border-border bg-background/60 px-5 py-3 text-sm text-white placeholder:text-muted transition-colors focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-glow"
              >
                Claim My Spot
              </button>
            </form>

            {status === "success" && (
              <p className="mt-4 text-sm text-accent">
                You&apos;re in. Watch your inbox for your invite.
              </p>
            )}

            <p className="mt-4 text-xs text-muted">
              By joining, you agree to receive occasional product updates. We never share your email.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
