/**
 * Shared skeleton primitives for dashboard loading states.
 * All use Tailwind's animate-pulse for the shimmer effect.
 */

export function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/10 ${className}`} />;
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded bg-white/10" />
          <div className="h-3 w-2/3 rounded bg-white/5" />
        </div>
      </div>
      <div className="mt-5 h-2 w-full rounded-full bg-white/5" />
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-3">
        <Bar className="h-8 w-48" />
        <Bar className="h-3 w-32 bg-white/5" />
      </div>
      <div className="h-11 w-11 animate-pulse rounded-full bg-white/10" />
    </div>
  );
}

/** Generic module page skeleton: header + a grid of cards. */
export function ModulePageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      <PageHeaderSkeleton />
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <CardSkeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="mt-8 animate-pulse rounded-2xl border border-border/60 bg-surface/60 p-6 shadow-card">
        <Bar className="h-3 w-40" />
        <div className="mt-6 h-56 w-full rounded-xl bg-white/5" />
      </div>
    </div>
  );
}
