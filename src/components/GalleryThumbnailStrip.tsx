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
  /** SSR: yalnızca ilk sayfa */
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
  const showDots = pageCount > 1;

  useEffect(() => {
    setPage(Math.floor(activeIndex / PAGE_SIZE));
  }, [activeIndex]);

  if (total <= 1) return null;

  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className="grid min-h-0 min-w-0 grid-cols-4 gap-1.5 overflow-hidden max-h-[6.375rem] sm:max-h-[7.375rem]">
        {visible.map((src, i) => {
          const idx = start + i;
          const active = activeIndex === idx;
          const inner = (
            <Image
              src={src}
              alt=""
              fill
              unoptimized
              className="object-cover object-center"
              sizes="96px"
            />
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

      {showDots ? (
        <div
          className="flex items-center justify-center gap-2"
          role="tablist"
          aria-label="Görsel sayfaları"
        >
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              disabled={staticPreview}
              onClick={() => setPage(i)}
              className="flex h-6 w-6 items-center justify-center disabled:pointer-events-none"
              role="tab"
              aria-selected={safePage === i}
              aria-label={`Görsel grubu ${i + 1}`}
            >
              <span
                className={`block rounded-full transition ${
                  safePage === i
                    ? "h-2.5 w-2.5 bg-blue-600"
                    : "h-2 w-2 bg-black/20 hover:bg-black/35"
                }`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
