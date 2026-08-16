function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-zinc-200 ${className}`} />;
}

function SpecRowSkeleton() {
  return (
    <div className="flex border-b border-black/8 last:border-b-0">
      <div className="w-[38%] bg-zinc-50 px-2.5 py-1.5 sm:w-[32%] sm:px-3">
        <Pulse className="h-3 w-16" />
      </div>
      <div className="flex-1 px-2.5 py-1.5 sm:px-3">
        <Pulse className="h-3 w-24" />
      </div>
    </div>
  );
}

export function ListingDetailSkeleton() {
  return (
    <article
      className="mx-auto w-full max-w-[1400px] flex-1 bg-white px-0 pb-24 pt-4 text-black md:px-6 md:pb-12 md:pt-4"
      aria-busy="true"
      aria-label="İlan yükleniyor"
    >
      <div className="listing-detail-title mb-4 flex items-center gap-1 px-4 md:px-0">
        <Pulse className="h-8 w-8 shrink-0" />
        <Pulse className="h-8 w-full max-w-2xl sm:h-9" />
      </div>
      <div className="listing-detail-layout">
        <div className="listing-detail-gallery min-w-0 px-4 md:px-0">
          <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
            <div className="aspect-[4/3] w-full animate-pulse bg-zinc-200 min-[80rem]:aspect-square min-[80rem]:min-h-[32rem]" />
            <div className="flex gap-2 p-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className="h-14 w-20 shrink-0 animate-pulse rounded-md bg-zinc-100"
                />
              ))}
            </div>
            <div className="px-3 pb-3">
              <Pulse className="h-3 w-64" />
            </div>
          </div>
        </div>

        <div className="listing-detail-intro min-w-0 space-y-2 px-4 md:px-0">
          <div className="flex items-center gap-3 min-[80rem]:hidden">
            <Pulse className="h-5 w-10" />
            <Pulse className="ml-auto h-8 w-36 sm:h-9 sm:w-44" />
          </div>
        </div>

        <div className="listing-detail-tabs min-w-0 px-4 md:px-0">
          <div className="mb-2 hidden min-[80rem]:flex min-[80rem]:items-center min-[80rem]:gap-3">
            <Pulse className="ml-auto h-8 w-44" />
          </div>
          <div className="space-y-2">
            <div className="flex gap-1.5">
              <Pulse className="h-8 flex-1 rounded-lg" />
              <Pulse className="h-8 flex-1 rounded-lg" />
              <Pulse className="h-8 flex-1 rounded-lg" />
            </div>
            <div className="flex justify-between">
              <Pulse className="h-4 w-24" />
              <Pulse className="h-3 w-28" />
            </div>
            <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
              {Array.from({ length: 8 }, (_, i) => (
                <SpecRowSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>

        <div className="listing-detail-aside min-w-0 px-4 md:px-0">
          <div className="shrink-0 rounded-xl border border-black/10 bg-white p-3">
            <Pulse className="mb-2 h-3 w-14" />
            <div className="space-y-2">
              <Pulse className="h-4 w-full" />
              <Pulse className="h-4 w-3/4" />
              <Pulse className="h-4 w-1/2" />
            </div>
          </div>
          <div className="mt-3 hidden h-24 animate-pulse rounded-xl bg-zinc-100 lg:block" />
        </div>
      </div>
    </article>
  );
}
