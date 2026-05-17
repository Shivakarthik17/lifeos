type Step = {
  number: string;
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    number: "01",
    title: "Track",
    description:
      "Log habits, workouts, expenses, and reflections in seconds. LifeOS captures the signals that shape your life.",
  },
  {
    number: "02",
    title: "Analyze",
    description:
      "See patterns across every pillar. Spot what's working, what's slipping, and where to focus next.",
  },
  {
    number: "03",
    title: "Improve",
    description:
      "Get personalized nudges, weekly reviews, and clear next steps. Compound small wins into a better you.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative border-t border-border/60 bg-surface/30 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-accent">
            How it works
          </span>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Three steps to a disciplined life
          </h2>
          <p className="mt-4 text-pretty text-muted sm:text-lg">
            A simple loop that gets sharper every week you use it.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.number}
              className="group relative rounded-2xl border border-border bg-surface p-8 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-glow"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/40 bg-accent-soft font-mono text-sm font-bold text-accent">
                  {step.number}
                </span>
                <h3 className="text-xl font-semibold text-white">{step.title}</h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {step.description}
              </p>

              {i < steps.length - 1 && (
                <span
                  className="pointer-events-none absolute right-0 top-1/2 hidden h-px w-12 -translate-y-1/2 translate-x-full bg-gradient-to-r from-accent/60 to-transparent md:block"
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
