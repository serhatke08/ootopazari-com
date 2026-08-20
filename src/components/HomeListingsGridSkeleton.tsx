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
          className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
        >
          <div className="aspect-[4/3] animate-pulse bg-zinc-200" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-zinc-200" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
