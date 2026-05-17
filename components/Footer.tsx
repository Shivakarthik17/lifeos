import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 sm:flex-row sm:justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-accent"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="M4 12h4l2-7 4 14 2-7h4" />
            </svg>
          </span>
          LifeOS
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
          <a href="#features" className="transition-colors hover:text-white">
            Features
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-white">
            How it works
          </a>
          <a href="#waitlist" className="transition-colors hover:text-white">
            Waitlist
          </a>
          <a href="#" className="transition-colors hover:text-white">
            Privacy
          </a>
          <a href="#" className="transition-colors hover:text-white">
            Terms
          </a>
        </nav>

        <p className="text-xs text-muted">
          © {year} LifeOS. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
