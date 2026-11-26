/** Lightweight placeholders while listings load (design spec §22, §25). */
export function MissionCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-surface p-4" aria-hidden>
      <div className="flex items-start gap-3">
        <div className="size-12 animate-pulse rounded-xl bg-elevated" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 animate-pulse rounded bg-elevated" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-elevated" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-elevated" />
        </div>
        <div className="h-6 w-14 animate-pulse rounded bg-elevated" />
      </div>
      <div className="h-3 w-2/3 animate-pulse rounded bg-elevated" />
      <div className="h-11 animate-pulse rounded-xl bg-elevated" />
    </div>
  );
}

export function MissionGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading missions"
      className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: count }, (_, i) => (
        <MissionCardSkeleton key={i} />
      ))}
    </div>
  );
}
