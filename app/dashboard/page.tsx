import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDashboardData, type ModuleKey } from "@/lib/dashboard";
import LifeScoreTrend from "./LifeScoreTrend";
import AICoach from "./AICoach";

// Cache the rendered dashboard for 60s to reduce repeated DB reads.
export const revalidate = 60;

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getInitials(nameOrEmail: string) {
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return nameOrEmail.slice(0, 2).toUpperCase();
}

const MODULE_UI = [
  {
    key: "finance",
    title: "Finance",
    accent: "from-emerald-500/40 to-emerald-500/0",
    iconBg: "bg-emerald-500/10 text-emerald-300",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9.5c-.7-1-1.9-1.5-3-1.5-1.7 0-3 .8-3 2.2 0 1.3 1.2 1.7 3 2.2s3 .9 3 2.2c0 1.4-1.3 2.2-3 2.2-1.1 0-2.3-.5-3-1.5M12 7v1M12 16v1" />
      </svg>
    ),
  },
  {
    key: "fitness",
    title: "Fitness",
    accent: "from-rose-500/40 to-rose-500/0",
    iconBg: "bg-rose-500/10 text-rose-300",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M6 6v12M3 9v6M18 6v12M21 9v6M6 12h12" />
      </svg>
    ),
  },
  {
    key: "mind",
    title: "Mind",
    accent: "from-violet-500/40 to-violet-500/0",
    iconBg: "bg-violet-500/10 text-violet-300",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-3 3 3 3 0 0 0 1 2.2A3 3 0 0 0 4 14a3 3 0 0 0 2 2.8A3 3 0 0 0 9 20a3 3 0 0 0 3-3V5a2 2 0 0 0-2-2H9ZM15 3a3 3 0 0 1 3 3 3 3 0 0 1 3 3 3 3 0 0 1-1 2.2A3 3 0 0 1 20 14a3 3 0 0 1-2 2.8A3 3 0 0 1 15 20a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2h1Z" />
      </svg>
    ),
  },
  {
    key: "business",
    title: "Business",
    accent: "from-amber-500/40 to-amber-500/0",
    iconBg: "bg-amber-500/10 text-amber-300",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
      </svg>
    ),
  },
  {
    key: "discipline",
    title: "Discipline",
    accent: "from-sky-500/40 to-sky-500/0",
    iconBg: "bg-sky-500/10 text-sky-300",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" />
      </svg>
    ),
  },
  {
    key: "people",
    title: "People",
    accent: "from-pink-500/40 to-pink-500/0",
    iconBg: "bg-pink-500/10 text-pink-300",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5M14 20c0-2 1.5-3.5 3.5-3.5S21 18 21 20" />
      </svg>
    ),
  },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user;

  const now = new Date();
  const displayName = user.name ?? user.email ?? "there";
  const firstName = displayName.split(/\s+/)[0];
  const initials = getInitials(displayName);
  const greeting = getGreeting(now.getHours());
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // getDashboardData never throws, but guard defensively in case it ever
  // returns null/undefined so the page can still render.
  const dashboard = await getDashboardData(user.email ?? "");
  const lifeScore = dashboard?.lifeScore ?? 0;
  const moduleData = dashboard?.modules;
  const brief = dashboard?.brief ?? "Welcome to LifeOS. Start logging your data!";
  const trend = dashboard?.trend ?? [];

  // Merge the visual definitions with the real, computed data.
  const cards = MODULE_UI.map((ui) => {
    const data = moduleData?.[ui.key as ModuleKey];
    return {
      ...ui,
      score: data?.score ?? null,
      status: data?.status ?? "No data yet",
    };
  });

  const trackedCount = cards.filter((c) => c.score !== null).length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted">{dateStr}</p>
        </div>
        <div className="flex items-center gap-3">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={displayName}
              className="h-11 w-11 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-accent-soft text-sm font-semibold text-white">
              {initials}
            </div>
          )}
        </div>
      </header>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-surface/60 p-6 shadow-card lg:col-span-1">
          <p className="text-sm text-muted">Life Score</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-5xl font-semibold text-white">{lifeScore}</span>
            <span className="mb-1 text-sm text-muted">/ 100</span>
          </div>
          <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover"
              style={{ width: `${lifeScore}%` }}
            />
          </div>
          <p className="mt-4 text-xs text-muted">
            {trackedCount > 0
              ? `Live score from your real data across ${trackedCount} of 6 modules.`
              : "Start logging in any module to build your score."}
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-surface/60 p-6 shadow-card lg:col-span-2">
          <p className="text-sm text-muted">Module progress</p>
          <ul className="mt-4 space-y-3">
            {cards.map((m) => (
              <li key={m.key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white">{m.title}</span>
                  <span className="text-muted">
                    {m.score === null ? "—" : `${m.score}%`}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${m.score ?? 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border/60 bg-surface/60 p-6 shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Life Score — last 7 days</p>
        </div>
        <LifeScoreTrend data={trend} />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
          Modules
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((m) => (
            <article
              key={m.key}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card transition-colors hover:border-accent/50"
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${m.accent} opacity-0 transition-opacity group-hover:opacity-100`}
              />
              <div className="relative flex items-start gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.iconBg}`}>
                  {m.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white">{m.title}</h3>
                  <p className="mt-1 text-sm text-muted">{m.status}</p>
                </div>
              </div>
              <div className="relative mt-4 flex items-center justify-between text-xs">
                <span className="text-muted">Score</span>
                <span className="font-medium text-white">
                  {m.score === null ? "Not tracked" : `${m.score}%`}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border/60 bg-gradient-to-br from-surface to-surface-2 p-6 shadow-card">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </span>
          <h2 className="text-base font-semibold text-white">Daily brief</h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">{brief}</p>
        <p className="mt-3 text-xs text-muted">
          Built from your real data. Ask the AI coach below for deeper,
          conversational insights.
        </p>
      </section>

      <AICoach />
    </div>
  );
}
