"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const PER_ROW = 4;
const MAX_ROWS = 2;
const PAGE_SIZE = PER_ROW * MAX_ROWS;

const thumbClass = (active: boolean) =>
  `relative h-12 w-20 shrink-0 overflow-hidden rounded border-2 bg-black transition sm:h-14 sm:w-24 ${
    active ? "border-black" : "border-black/20 hover:border-black/45"
  }`;

type Props = {
  images: string[];
  activeIndex: number;
  onSelect?: (index: number) => void;
  /** SSR: yalnızca ilk sayfa, buton yok */
  staticPreview?: boolean;
};

export function GalleryThumbnailStrip({
  images,
  activeIndex,
  onSelect,
  staticPreview = false,
}: Props) {
  const [page, setPage] = useState(0);
  const total = images.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const visible = images.slice(start, start + PAGE_SIZE);
  const hasMore = safePage < pageCount - 1;
  const hasPrev = safePage > 0;

  useEffect(() => {
    setPage(Math.floor(activeIndex / PAGE_SIZE));
  }, [activeIndex]);

  if (total <= 1) return null;

  return (
    <div className="flex shrink-0 items-center gap-1">
      {hasPrev ? (
        <button
          type="button"
          disabled={staticPreview}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="flex h-[6.375rem] w-9 shrink-0 items-center justify-center rounded-lg border border-black/15 bg-white text-lg font-semibold text-black shadow-sm transition hover:bg-black/[0.04] disabled:pointer-events-none disabled:opacity-40 sm:h-[7.375rem]"
          aria-label="Önceki görseller"
        >
          ‹
        </button>
      ) : null}
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-4 gap-1.5 overflow-hidden max-h-[6.375rem] sm:max-h-[7.375rem]">
        {visible.map((src, i) => {
          const idx = start + i;
          const active = activeIndex === idx;
          const inner = (
            <>
              <Image
                src={src}
                alt=""
                fill
                unoptimized
                className="object-cover object-center"
                sizes="96px"
              />
            </>
          );
          if (staticPreview || !onSelect) {
            return (
              <div
                key={`${src}-${idx}`}
                className={thumbClass(active)}
                aria-hidden={!active}
              >
                {inner}
              </div>
            );
          }
          return (
            <button
              key={`${src}-${idx}`}
              type="button"
              onClick={() => onSelect(idx)}
              className={thumbClass(active)}
              aria-label={`Görsel ${idx + 1}`}
              aria-current={active}
            >
              {inner}
            </button>
          );
        })}
      </div>

      {hasMore ? (
        <button
          type="button"
          disabled={staticPreview}
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          className="flex h-[6.375rem] w-9 shrink-0 items-center justify-center rounded-lg border border-black/15 bg-white text-lg font-semibold text-black shadow-sm transition hover:bg-black/[0.04] disabled:pointer-events-none disabled:opacity-40 sm:h-[7.375rem]"
          aria-label="Sonraki görseller"
        >
          ›
        </button>
      ) : null}
    </div>
  );
}
