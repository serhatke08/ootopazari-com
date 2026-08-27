"use client";

import { useEffect, useState } from "react";
import {
  coverAspectRatioForViewportWidth,
  homeFeedPreviewCardWidth,
} from "@/lib/listing-feed-cover";

type Props = {
  coverImageUrl: string | null;
  titlePreview: string;
  onOpenGallery: () => void;
};

export function ListingHomeCoverPreview({
  coverImageUrl,
  titlePreview,
  onOpenGallery,
}: Props) {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 390
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const aspect = coverAspectRatioForViewportWidth(width);
  const cardWidth = homeFeedPreviewCardWidth(width);

  return (
    <div className="pt-3">
      <p className="text-[11px] font-semibold text-zinc-600">
        Ana sayfa önizlemesi
      </p>
      <p className="mt-0.5 text-[10px] text-zinc-500">
        Fotoğraf eklemek için önizlemeye veya «Fotoğraf ekle»ye dokunun
      </p>
      <button
        type="button"
        onClick={onOpenGallery}
        className="mt-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        aria-label="Fotoğraf ekle"
      >
        <div
          className="overflow-hidden rounded-lg border border-black/10 bg-[#ebebeb] shadow-sm"
          style={{ width: cardWidth }}
        >
          <div style={{ aspectRatio: `${aspect}` }} className="relative w-full bg-zinc-200">
            {coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob / storage önizleme
              <img
                src={coverImageUrl}
                alt="Kapak önizlemesi"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-2 text-center">
                <span className="text-2xl text-zinc-500" aria-hidden>
                  📷
                </span>
                <span className="text-[10px] font-semibold text-zinc-600">
                  Fotoğraf eklemek için dokunun
                </span>
              </div>
            )}
          </div>
          <div className="space-y-1 px-2 py-2">
            <div className="h-2 w-full rounded bg-zinc-400" />
            <div className="h-2 w-[55%] rounded bg-zinc-300" />
            {titlePreview.trim() ? (
              <p className="truncate pt-0.5 text-[10px] font-semibold text-zinc-800">
                {titlePreview.trim()}
              </p>
            ) : null}
          </div>
        </div>
      </button>
    </div>
  );
}
