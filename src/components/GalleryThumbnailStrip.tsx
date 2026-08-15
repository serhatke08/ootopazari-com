"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

const thumbClass = (active: boolean) =>
  `relative h-[3.25rem] w-[4.25rem] shrink-0 overflow-hidden rounded border-2 bg-zinc-100 transition sm:h-16 sm:w-[5.25rem] ${
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLElement | null>(null);
  const total = images.length;

  useEffect(() => {
    const scroller = scrollerRef.current;
    const el = activeRef.current;
    if (!scroller || !el) return;
    const left = el.offsetLeft - (scroller.clientWidth - el.offsetWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [activeIndex]);

  if (total <= 1) return null;

  return (
    <div
      ref={scrollerRef}
      className="flex min-w-0 gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:thin] [-ms-overflow-style:auto] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300"
    >
      {images.map((src, idx) => {
        const active = activeIndex === idx;
        const inner = (
          <span className="absolute inset-0.5">
            <Image
              src={src}
              alt=""
              fill
              unoptimized
              className="object-contain object-center"
              style={{ objectFit: "contain" }}
              sizes="96px"
            />
          </span>
        );
        if (staticPreview || !onSelect) {
          return (
            <div
              key={`${src}-${idx}`}
              ref={active ? (node) => { activeRef.current = node; } : undefined}
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
            ref={active ? (node) => { activeRef.current = node; } : undefined}
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
  );
}
