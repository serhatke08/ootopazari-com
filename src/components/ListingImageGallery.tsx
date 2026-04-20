"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

export function ListingImageGallery({
  images,
  alt,
  overlay,
}: {
  images: string[];
  alt: string;
  /** Ana görselin sağ üst köşesi (örn. favori) */
  overlay?: ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const list = images.filter(Boolean);
  const main = list[active] ?? list[0];

  const goPrev = useCallback(() => {
    setActive((a) => (a > 0 ? a - 1 : list.length - 1));
  }, [list.length]);

  const goNext = useCallback(() => {
    setActive((a) => (a < list.length - 1 ? a + 1 : 0));
  }, [list.length]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (list.length <= 1) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox, list.length, goPrev, goNext]);

  if (!main) {
    return (
      <div className="relative">
        <div className="flex aspect-[16/10] w-full items-center justify-center rounded-xl border border-black/10 bg-zinc-100 text-sm text-zinc-500">
          Görsel yok
        </div>
        {overlay ? (
          <div className="absolute right-2 top-2 z-10">{overlay}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-black/10 bg-zinc-100">
        <Image
          src={main}
          alt={alt}
          fill
          unoptimized
          className="pointer-events-none object-cover object-center"
          priority
          sizes="(max-width: 640px) 100vw, 60vw"
        />
        <button
          type="button"
          className="absolute inset-0 z-[1] cursor-zoom-in bg-transparent outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-white/40"
          onClick={() => setLightbox(true)}
          aria-label="Tam ekran için tıklayın"
        />
        {overlay ? (
          <div className="pointer-events-auto absolute right-2 top-2 z-20">
            {overlay}
          </div>
        ) : null}
      </div>

      {list.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {list.map((src, idx) => (
            <button
              key={`${src}-${idx}`}
              type="button"
              onClick={() => setActive(idx)}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 bg-black transition sm:h-[4.75rem] sm:w-28 ${
                active === idx
                  ? "border-black"
                  : "border-black/20 hover:border-black/45"
              }`}
              aria-label={`Görsel ${idx + 1}`}
              aria-current={active === idx}
            >
              <Image
                src={src}
                alt=""
                fill
                unoptimized
                className="object-cover object-center"
                sizes="112px"
              />
            </button>
          ))}
        </div>
      ) : null}

      {lightbox ? (
        <div
          className="fixed inset-0 z-[200] bg-black"
          role="dialog"
          aria-modal="true"
          aria-label="Tam ekran görsel"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl font-light leading-none text-white transition hover:bg-white/25 sm:right-4 sm:top-4"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(false);
            }}
            aria-label="Kapat"
          >
            ×
          </button>

          {list.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-2 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:left-4"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                aria-label="Önceki görsel"
              >
                <span className="text-lg" aria-hidden>
                  ‹
                </span>
              </button>
              <button
                type="button"
                className="absolute right-2 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:right-4"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                aria-label="Sonraki görsel"
              >
                <span className="text-lg" aria-hidden>
                  ›
                </span>
              </button>
            </>
          ) : null}

          <div
            className="absolute inset-3 flex items-center justify-center sm:inset-4 sm:pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-full min-h-0 w-full">
              <Image
                src={list[active]}
                alt={alt}
                fill
                unoptimized
                className="object-contain object-center"
                sizes="100vw"
                priority
              />
            </div>
          </div>

          {list.length > 1 ? (
            <p className="pointer-events-none absolute bottom-4 left-0 right-0 z-20 text-center text-xs text-white/70">
              {active + 1} / {list.length}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
