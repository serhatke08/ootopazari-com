import { HomeListingsGridSkeleton } from "@/components/HomeListingsGridSkeleton";
import { ListingDetailSkeleton } from "@/components/ListingDetailSkeleton";
import { SkeletonPulse } from "@/components/skeletons/SkeletonPulse";

export function GenericPageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6"
      aria-busy="true"
      aria-label="Sayfa yükleniyor"
    >
      <SkeletonPulse className="mb-6 h-8 w-48" />
      <div className="space-y-3">
        <SkeletonPulse className="h-4 w-full max-w-2xl" />
        <SkeletonPulse className="h-4 w-full max-w-xl" />
        <SkeletonPulse className="h-4 w-full max-w-lg" />
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonPulse key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function ProfilPageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6"
      aria-busy="true"
      aria-label="Profil yükleniyor"
    >
      <div className="flex items-center justify-between gap-3">
        <SkeletonPulse className="h-8 w-28" />
        <SkeletonPulse className="h-10 w-10 rounded-xl" />
      </div>
      <div className="mt-6 flex items-start gap-4">
        <SkeletonPulse className="h-20 w-20 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2 pt-1">
          <SkeletonPulse className="h-6 w-40" />
          <SkeletonPulse className="h-4 w-56" />
          <SkeletonPulse className="h-4 w-32" />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <SkeletonPulse key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>
      <div className="mt-8">
        <HomeListingsGridSkeleton count={3} />
      </div>
    </div>
  );
}

export function MessagesPageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-6xl flex-1 px-2 py-6 sm:px-4 md:px-6 md:py-8"
      aria-busy="true"
      aria-label="Mesajlar yükleniyor"
    >
      <SkeletonPulse className="h-8 w-32" />
      <SkeletonPulse className="mt-2 h-4 w-64 max-w-full" />
      <div className="mt-6 space-y-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3"
          >
            <SkeletonPulse className="h-12 w-12 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonPulse className="h-4 w-32" />
              <SkeletonPulse className="h-3 w-full max-w-xs" />
            </div>
            <SkeletonPulse className="hidden h-3 w-10 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListPageSkeleton({ titleWidth = "w-36" }: { titleWidth?: string }) {
  return (
    <div
      className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6"
      aria-busy="true"
      aria-label="Liste yükleniyor"
    >
      <SkeletonPulse className={`h-8 ${titleWidth}`} />
      <SkeletonPulse className="mt-2 h-4 w-56" />
      <div className="mt-6">
        <HomeListingsGridSkeleton count={9} />
      </div>
    </div>
  );
}

export function HomeBrowseSkeleton() {
  return (
    <div aria-busy="true" aria-label="Ana sayfa yükleniyor">
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] gap-2 overflow-hidden px-2 py-1.5 sm:px-4">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex w-[3.75rem] shrink-0 flex-col items-center gap-1">
              <SkeletonPulse className="h-10 w-10 rounded-full" />
              <SkeletonPulse className="h-2 w-9" />
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-1.5 pb-6 sm:px-6">
        <div className="mb-1.5 flex justify-end gap-1.5">
          <SkeletonPulse className="h-7 w-24" />
          <SkeletonPulse className="h-7 w-16" />
          <SkeletonPulse className="h-7 w-14" />
        </div>
        <SkeletonPulse className="mb-3 h-4 w-28" />
        <HomeListingsGridSkeleton count={12} />
      </div>
    </div>
  );
}

export function skeletonForPath(pathname: string) {
  const path = pathname.split("?")[0] || "/";

  if (path.startsWith("/ilan/")) {
    return <ListingDetailSkeleton />;
  }
  if (path.startsWith("/profil")) {
    return <ProfilPageSkeleton />;
  }
  if (path.startsWith("/mesajlar")) {
    return <MessagesPageSkeleton />;
  }
  if (path === "/favoriler" || path === "/ilanlar" || path === "/sifir-araclar" || path === "/acil") {
    return <ListPageSkeleton />;
  }
  if (path === "/") {
    return <HomeBrowseSkeleton />;
  }
  return <GenericPageSkeleton />;
}
