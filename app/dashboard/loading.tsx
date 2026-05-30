import { Bar, CardSkeleton, PageHeaderSkeleton } from "./skeletons";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      <PageHeaderSkeleton />

      {/* Life Score + module progress row */}
      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="animate-pulse rounded-2xl border border-border/60 bg-surface/60 p-6 shadow-card lg:col-span-1">
          <Bar className="h-3 w-24" />
          <Bar className="mt-3 h-12 w-28" />
          <div className="mt-5 h-2 w-full rounded-full bg-white/5" />
        </div>
        <div className="animate-pulse rounded-2xl border border-border/60 bg-surface/60 p-6 shadow-card lg:col-span-2">
          <Bar className="h-3 w-28" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-2 w-full rounded-full bg-white/5" />
            ))}
          </div>
        </div>
      </section>

      {/* Trend chart */}
      <section className="mt-8 animate-pulse rounded-2xl border border-border/60 bg-surface/60 p-6 shadow-card">
        <Bar className="h-3 w-40" />
        <div className="mt-4 h-48 w-full rounded-xl bg-white/5" />
      </section>

      {/* Module cards */}
      <section className="mt-8">
        <Bar className="h-3 w-20" />
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} className="h-32" />
          ))}
        </div>
      </section>
    </div>
  );
}
