import { QUICK_ACCESS_LINKS } from "@/lib/quick-access-links";
import { HomeListingsGridSkeleton } from "@/components/HomeListingsGridSkeleton";

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-200 ${className}`} />;
}

function QuickLinksStripSkeleton() {
  return (
    <div className="border-b border-zinc-200 bg-white" aria-hidden>
      <div className="mx-auto max-w-[1400px] px-2 py-3 sm:px-4 md:px-6">
        <div className="flex gap-2 overflow-hidden pb-1">
          {QUICK_ACCESS_LINKS.map((d) => (
            <div
              key={d.href}
              className="flex w-[4.35rem] shrink-0 flex-col items-center gap-1"
            >
              <div className="h-12 w-12 animate-pulse rounded-full bg-zinc-200 ring-1 ring-zinc-900/10 ring-offset-2 ring-offset-white" />
              <Pulse className="h-2.5 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="home-category-cascade-scroll flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden pr-0.5">
      <div className="min-h-0 flex-1 space-y-1.5 rounded-lg border border-zinc-200 bg-white p-2">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-md px-1.5 py-1.5"
          >
            <Pulse className="h-7 w-7 shrink-0 rounded-md" />
            <Pulse className={`h-3 ${i % 3 === 0 ? "w-24" : i % 3 === 1 ? "w-20" : "w-16"}`} />
          </div>
        ))}
      </div>
      <div className="mt-2 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <Pulse className="aspect-[4/3] w-full rounded-none" />
      </div>
    </div>
  );
}

/** Yalnızca ana sayfa. İlan detay iskeleti `ListingNavSkeletonGate` + sayfa içi Suspense. */
export default function RootLoading() {
  return (
    <>
      <QuickLinksStripSkeleton />
      <div
        id="ilanlar"
        className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6"
        aria-busy="true"
        aria-label="Ana sayfa yükleniyor"
      >
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-4 lg:gap-5">
          <aside className="hidden w-full shrink-0 md:sticky md:top-[5.5rem] md:flex md:h-[calc(100dvh-5.5rem)] md:max-h-[calc(100dvh-5.5rem)] md:min-h-0 md:w-[min(220px,30vw)] md:min-w-[180px] md:max-w-[240px] md:flex-col md:overflow-hidden md:self-start lg:w-[min(280px,22vw)] lg:min-w-[240px] lg:max-w-[300px]">
            <SidebarSkeleton />
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center gap-1.5">
              <Pulse className="mr-auto h-5 w-16 sm:h-6 sm:w-20" />
              <div className="flex min-w-0 items-center gap-1">
                <Pulse className="h-7 w-24" />
                <Pulse className="h-7 w-16" />
                <Pulse className="h-7 w-14" />
              </div>
            </div>
            <div className="mb-4 hidden h-[90px] animate-pulse rounded-xl bg-zinc-100 sm:block" />
            <HomeListingsGridSkeleton count={12} />
          </div>
        </div>
      </div>
    </>
  );
}
