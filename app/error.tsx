"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log so the real cause shows up in Vercel / server logs.
    console.error("App error boundary:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-white">
      <span className="mb-8 flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white shadow-glow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
          <path d="M4 12h4l2-7 4 14 2-7h4" />
        </svg>
      </span>

      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        An unexpected error occurred. You can try again, or head back to your
        dashboard.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-glow"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-full border border-border/60 px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-white"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
