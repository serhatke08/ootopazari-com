import { HomeListingsGridSkeleton } from "@/components/HomeListingsGridSkeleton";

export default function HomeLoading() {
  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center justify-end gap-2">
        <div className="h-9 w-28 animate-pulse rounded-lg bg-zinc-200" />
        <div className="h-9 w-20 animate-pulse rounded-lg bg-zinc-200" />
      </div>
      <div className="mb-4 h-4 w-32 animate-pulse rounded bg-zinc-200" />
      <HomeListingsGridSkeleton count={10} />
    </div>
  );
}
