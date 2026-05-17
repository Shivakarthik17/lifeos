import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white transition-colors hover:text-accent"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white shadow-glow">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M4 12h4l2-7 4 14 2-7h4" />
            </svg>
          </span>
          LifeOS
        </Link>

        <a
          href="#waitlist"
          className="inline-flex items-center justify-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-glow"
        >
          Get Early Access
        </a>
      </nav>
    </header>
  );
}
