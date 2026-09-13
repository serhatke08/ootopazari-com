export function HomeListingsGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div
      className="home-listings-grid"
      aria-busy="true"
      aria-label="İlanlar yükleniyor"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-lg border border-zinc-100 bg-white sm:rounded-xl"
        >
          <div className="aspect-[4/5] bg-zinc-100 md:aspect-[4/3]">
            <div className="h-full w-full animate-pulse bg-zinc-200/70" />
          </div>
          <div className="space-y-1.5 p-1.5 pt-2 sm:p-2 md:p-1.5">
            <div className="h-3.5 w-full animate-pulse rounded bg-zinc-100" />
            <div className="h-3.5 w-[65%] animate-pulse rounded bg-zinc-100" />
            <div className="flex items-center justify-between gap-1 pt-0.5">
              <div className="h-2.5 w-12 animate-pulse rounded bg-zinc-50" />
              <div className="h-2.5 w-10 animate-pulse rounded bg-zinc-50" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
