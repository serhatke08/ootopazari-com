/** PC ilan sohbeti yüklenirken yer tutucu (SSR kapalı panel ile aynı boyut). */
export function ListingPublicChatPanelSkeleton() {
  return (
    <div
      className="listing-public-chat mt-4 hidden min-[80rem]:flex min-[80rem]:min-h-[26rem] min-[80rem]:flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
      aria-hidden
    >
      <div className="h-[5.25rem] animate-pulse bg-gradient-to-r from-emerald-800/80 via-emerald-700/70 to-emerald-600/60" />
      <div className="min-h-[18rem] flex-1 animate-pulse bg-zinc-100/80" />
      <div className="h-[7.5rem] border-t border-black/8 bg-white p-3.5">
        <div className="h-full animate-pulse rounded-xl bg-zinc-100" />
      </div>
    </div>
  );
}
