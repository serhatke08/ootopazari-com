import { HomeListingsGridSkeleton } from "@/components/HomeListingsGridSkeleton";

/** Yalnızca ana sayfa ve benzeri genel rotalar için; ilan detayın kendi loading.tsx dosyası var. */
export default function RootLoading() {
  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center justify-end gap-2">
        <div className="h-9 w-28 animate-pulse rounded-lg bg-zinc-200" />
        <div className="h-9 w-20 animate-pulse rounded-lg bg-zinc-200" />
      </div>
      <HomeListingsGridSkeleton count={10} />
    </div>
  );
}
