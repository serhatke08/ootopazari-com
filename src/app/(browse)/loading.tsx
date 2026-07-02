import { HomeListingsGridSkeleton } from "@/components/HomeListingsGridSkeleton";

/** Yalnızca ana sayfa ve benzeri genel rotalar için; ilan detayın kendi loading.tsx dosyası var. */
export default function RootLoading() {
  return (
    <div id="ilanlar" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-5">
        <aside className="hidden w-full shrink-0 lg:flex lg:h-[calc(100dvh-5.5rem)] lg:max-h-[calc(100dvh-5.5rem)] lg:min-h-0 lg:w-[min(280px,22vw)] lg:min-w-[240px] lg:max-w-[300px] lg:flex-col lg:overflow-hidden">
          <div className="h-full rounded-xl border border-zinc-200 bg-white p-3">
            <div className="space-y-2">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="h-9 animate-pulse rounded-lg bg-zinc-100" />
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-200" />
            <div className="flex items-center gap-2">
              <div className="h-9 w-28 animate-pulse rounded-lg bg-zinc-200" />
              <div className="h-9 w-20 animate-pulse rounded-lg bg-zinc-200" />
            </div>
          </div>
          <HomeListingsGridSkeleton count={15} />
        </div>
      </div>
    </div>
  );
}
