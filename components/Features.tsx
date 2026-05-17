type Feature = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

const iconClass = "h-6 w-6";

const features: Feature[] = [
  {
    title: "Finance",
    description:
      "Track spending, savings, and net worth. Make money decisions with data, not anxiety.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: "Fitness",
    description:
      "Log workouts, monitor body metrics, and stay consistent. Build the body that carries your ambition.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true">
        <path d="M6.5 6.5 17.5 17.5" />
        <path d="m21 21-1-1" />
        <path d="m3 3 1 1" />
        <path d="m18 22 4-4" />
        <path d="m2 6 4-4" />
        <path d="m3 10 7-7" />
        <path d="m14 21 7-7" />
      </svg>
    ),
  },
  {
    title: "Mind",
    description:
      "Journal, meditate, and reflect with structure. Clear thinking is the foundation of every other win.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true">
        <path d="M12 2a4.5 4.5 0 0 0-4.5 4.5c0 .77.18 1.5.5 2.14A4.5 4.5 0 0 0 6 13c0 1.06.37 2.04 1 2.81V18a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3v-2.19c.63-.77 1-1.75 1-2.81a4.5 4.5 0 0 0-2-3.36c.32-.64.5-1.37.5-2.14A4.5 4.5 0 0 0 12 2Z" />
        <path d="M12 13v8" />
      </svg>
    ),
  },
  {
    title: "Business",
    description:
      "Plan projects, track revenue, and ship faster. Turn ideas into income with a clear operating cadence.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    title: "Daily Discipline",
    description:
      "Build streaks, set rituals, and track habits that compound. Tiny wins, every single day.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: "People",
    description:
      "Nurture relationships with intention. Remember birthdays, follow-ups, and the people who matter most.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-accent">
            Six pillars
          </span>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            One system. Every area of your life.
          </h2>
          <p className="mt-4 text-pretty text-muted sm:text-lg">
            Stop juggling apps. LifeOS unifies the six pillars of a disciplined life.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-glow"
            >
              <div
                className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                aria-hidden="true"
              />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent transition-transform duration-300 group-hover:scale-110">
                {feature.icon}
              </div>
              <h3 className="relative mt-5 text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
