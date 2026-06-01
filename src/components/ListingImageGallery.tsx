"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GalleryThumbnailStrip } from "@/components/GalleryThumbnailStrip";

type GalleryProps = {
  images: string[];
  alt: string;
  overlay?: ReactNode;
  compact?: boolean;
};

const SWIPE_THRESHOLD_PX = 40;

function galleryShellClass() {
  return "space-y-2 p-2 sm:p-3";
}

function mainFrameClass(compact: boolean) {
  return `relative w-full touch-pan-y overflow-hidden rounded-lg bg-zinc-100 aspect-[4/3] ${
    compact ? "" : "sm:aspect-[3/2]"
  }`;
}

function mainImageClass(compact: boolean) {
  return `pointer-events-none object-center select-none ${
    compact ? "object-contain" : "object-cover"
  }`;
}

export function ListingImageGallery({
  images,
  alt,
  overlay,
  compact = false,
}: GalleryProps) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const swipeRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    moved: false,
  });
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });
  const list = images.filter(Boolean);
  const main = list[active] ?? list[0];
  const hasMultiple = list.length > 1;

  const goPrev = useCallback(() => {
    setActive((a) => (a > 0 ? a - 1 : list.length - 1));
  }, [list.length]);

  const goNext = useCallback(() => {
    setActive((a) => (a < list.length - 1 ? a + 1 : 0));
  }, [list.length]);

  const clampPan = useCallback((x: number, y: number, z: number) => {
    if (z <= 1) return { x: 0, y: 0 };
    const maxX = ((z - 1) * window.innerWidth) / 2;
    const maxY = ((z - 1) * window.innerHeight) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  const setZoomSafely = useCallback(
    (nextZoom: number) => {
      const z = Math.max(1, Math.min(4, Number(nextZoom.toFixed(2))));
      setZoom(z);
      if (z <= 1) {
        setPan({ x: 0, y: 0 });
      } else {
        setPan((p) => clampPan(p.x, p.y, z));
      }
    },
    [clampPan]
  );

  const zoomIn = useCallback(() => setZoomSafely(zoom + 0.25), [zoom, setZoomSafely]);
  const zoomOut = useCallback(() => setZoomSafely(zoom - 0.25), [zoom, setZoomSafely]);
  const zoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (!hasMultiple) return;
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
  }, [lightbox, hasMultiple, goPrev, goNext]);

  useEffect(() => {
    if (!lightbox) return;
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [lightbox, active]);

  const onMainPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    swipeRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onMainPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (swipeRef.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - swipeRef.current.startX;
    const dy = e.clientY - swipeRef.current.startY;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) swipeRef.current.moved = true;
  }, []);

  const onMainPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (swipeRef.current.pointerId !== e.pointerId) return;
      const dx = e.clientX - swipeRef.current.startX;
      const dy = e.clientY - swipeRef.current.startY;
      const { moved } = swipeRef.current;
      swipeRef.current.pointerId = -1;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      if (
        hasMultiple &&
        moved &&
        Math.abs(dx) >= SWIPE_THRESHOLD_PX &&
        Math.abs(dx) > Math.abs(dy)
      ) {
        if (dx < 0) goNext();
        else goPrev();
        return;
      }
      if (!moved) setLightbox(true);
    },
    [hasMultiple, goNext, goPrev]
  );

  const onMainPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    swipeRef.current.pointerId = -1;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onLightboxWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.deltaY < 0) setZoomSafely(zoom + 0.18);
      else setZoomSafely(zoom - 0.18);
    },
    [zoom, setZoomSafely]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (zoom <= 1) return;
      dragRef.current.dragging = true;
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;
      dragRef.current.startPanX = pan.x;
      dragRef.current.startPanY = pan.y;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [zoom, pan]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current.dragging || zoom <= 1) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPan(
        clampPan(
          dragRef.current.startPanX + dx,
          dragRef.current.startPanY + dy,
          zoom
        )
      );
    },
    [zoom, clampPan]
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.dragging = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  if (!main) {
    return (
      <div className="relative p-2 sm:p-3">
        <div className="flex aspect-[16/10] w-full items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-500">
          Görsel yok
        </div>
        {overlay ? (
          <div className="absolute right-4 top-4 z-10">{overlay}</div>
        ) : null}
      </div>
    );
  }

  const navBtnClass =
    "absolute top-1/2 z-[2] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-lg text-white shadow-sm transition hover:bg-black/60 sm:h-10 sm:w-10";

  return (
    <div className={galleryShellClass()}>
      <div
        className={`${mainFrameClass(compact)} cursor-zoom-in`}
        onPointerDown={onMainPointerDown}
        onPointerMove={onMainPointerMove}
        onPointerUp={onMainPointerUp}
        onPointerCancel={onMainPointerCancel}
        role={hasMultiple ? "group" : undefined}
        aria-label={hasMultiple ? "Görseller arasında kaydırın veya okları kullanın" : undefined}
      >
        <Image
          key={main}
          src={main}
          alt={alt}
          fill
          unoptimized
          draggable={false}
          className={mainImageClass(compact)}
          priority={active === 0}
          sizes="(max-width: 1024px) 100vw, 33vw"
        />
        {hasMultiple ? (
          <>
            <button
              type="button"
              className={`${navBtnClass} left-2`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Önceki görsel"
            >
              ‹
            </button>
            <button
              type="button"
              className={`${navBtnClass} right-2`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="Sonraki görsel"
            >
              ›
            </button>
            <p className="pointer-events-none absolute bottom-2 left-0 right-0 z-[2] text-center text-[11px] font-medium text-black/50">
              {active + 1} / {list.length}
            </p>
          </>
        ) : null}
        {overlay ? (
          <div className="pointer-events-auto absolute right-2 top-2 z-20">
            {overlay}
          </div>
        ) : null}
      </div>

      <GalleryThumbnailStrip
        images={list}
        activeIndex={active}
        onSelect={setActive}
      />

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

          <div className="absolute left-3 top-3 z-30 flex items-center gap-1.5 sm:left-4 sm:top-4">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg text-white transition hover:bg-white/25"
              onClick={(e) => {
                e.stopPropagation();
                zoomOut();
              }}
              aria-label="Uzaklaştır"
            >
              −
            </button>
            <button
              type="button"
              className="flex h-9 min-w-[3.25rem] items-center justify-center rounded-full bg-white/15 px-2 text-xs font-semibold text-white transition hover:bg-white/25"
              onClick={(e) => {
                e.stopPropagation();
                zoomReset();
              }}
              aria-label="Yakınlaştırmayı sıfırla"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg text-white transition hover:bg-white/25"
              onClick={(e) => {
                e.stopPropagation();
                zoomIn();
              }}
              aria-label="Yakınlaştır"
            >
              +
            </button>
          </div>

          {hasMultiple ? (
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
            onWheel={onLightboxWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`relative h-full min-h-0 w-full ${zoom > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
            >
              <Image
                src={list[active]}
                alt={alt}
                fill
                unoptimized
                draggable={false}
                className="object-contain object-center transition-transform duration-75 ease-out"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                }}
                sizes="100vw"
                priority
              />
            </div>
          </div>

          {hasMultiple ? (
            <p className="pointer-events-none absolute bottom-4 left-0 right-0 z-20 text-center text-xs text-white/70">
              {active + 1} / {list.length}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
