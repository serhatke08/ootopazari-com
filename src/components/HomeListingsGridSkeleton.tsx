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
          className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
        >
          <div className="aspect-square animate-pulse bg-zinc-200 md:aspect-[4/3]" />
          <div className="space-y-1.5 p-1.5 pt-2 sm:p-2 md:p-1.5">
            <div className="h-4 w-full animate-pulse rounded bg-zinc-200" />
            <div className="h-4 w-[70%] animate-pulse rounded bg-zinc-200" />
            <div className="flex items-center justify-between gap-1 pt-0.5">
              <div className="h-3 w-12 animate-pulse rounded bg-zinc-100" />
              <div className="h-3 w-10 animate-pulse rounded bg-zinc-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
