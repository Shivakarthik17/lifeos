import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-white">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-lg font-semibold tracking-tight text-white transition-colors hover:text-accent"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white shadow-glow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
            <path d="M4 12h4l2-7 4 14 2-7h4" />
          </svg>
        </span>
        LifeOS
      </Link>

      <p className="text-7xl font-bold tracking-tight text-accent">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-glow"
        >
          Back to dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-border/60 px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-white"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
