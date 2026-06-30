"use client";

import { useEffect, useState } from "react";

type Props = {
  listingId: string;
  initialViews: number;
  initialFavorites: number;
};

type ViewStatsEvent = CustomEvent<{
  listingId?: string;
  views?: number;
  favorites?: number;
}>;

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className ?? "h-4 w-4"}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className ?? "h-4 w-4"}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}

export function ListingDetailSellerStats({
  listingId,
  initialViews,
  initialFavorites,
}: Props) {
  const [views, setViews] = useState(initialViews);
  const [favorites, setFavorites] = useState(initialFavorites);

  useEffect(() => {
    function onStats(event: Event) {
      const custom = event as ViewStatsEvent;
      if (custom.detail?.listingId !== listingId) return;
      if (typeof custom.detail.views === "number") setViews(custom.detail.views);
      if (typeof custom.detail.favorites === "number") {
        setFavorites(custom.detail.favorites);
      }
    }

    window.addEventListener("listing:view-stats", onStats);
    return () => window.removeEventListener("listing:view-stats", onStats);
  }, [listingId]);

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/10 pt-3">
      <div className="rounded-lg border border-black/8 bg-zinc-50 px-2.5 py-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-black/50">
          <EyeIcon className="h-3.5 w-3.5 text-black/40" />
          Görüntüleme
        </p>
        <p className="mt-1 text-base font-bold tabular-nums text-black">
          {views.toLocaleString("tr-TR")}
        </p>
      </div>
      <div className="rounded-lg border border-black/8 bg-zinc-50 px-2.5 py-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-black/50">
          <HeartIcon className="h-3.5 w-3.5 text-black/40" />
          Favori
        </p>
        <p className="mt-1 text-base font-bold tabular-nums text-black">
          {favorites.toLocaleString("tr-TR")}
        </p>
      </div>
    </div>
  );
}
