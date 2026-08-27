"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { QUICK_ACCESS_LINKS } from "@/lib/quick-access-links";

function dealerBorderColor(label: string): string {
  const key = label.trim().toLocaleLowerCase("tr");
  if (key === "ekspertiz") return "#a91414";
  if (key === "galeri") return "#5e17eb";
  if (key === "parça") return "#2e6417";
  if (key === "kiralama") return "#0081cc";
  if (key === "pazar") return "#111111";
  if (key === "acil") return "#dc2626";
  if (key === "vitrin" || key === "sıfır araçlar" || key === "sifir araclar")
    return "#059669";
  return "#f59e0b";
}

function QuickLinkItem({
  href,
  label,
  image,
}: {
  href: string;
  label: string;
  image?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex w-[4.25rem] shrink-0 flex-col items-center gap-0.5 sm:w-[4.5rem]"
      draggable={false}
    >
      <span
        className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 bg-white ring-1 ring-zinc-900/10 transition group-hover:brightness-110"
        style={{ borderColor: dealerBorderColor(label) }}
      >
        {image ? (
          image.endsWith(".svg") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <Image
              src={image}
              alt=""
              fill
              className="object-cover"
              sizes="40px"
              draggable={false}
            />
          )
        ) : (
          <span className="text-[10px] font-bold text-zinc-700">
            {label.slice(0, 1)}
          </span>
        )}
      </span>
      <span className="w-full text-center text-[9px] font-medium leading-tight text-zinc-800">
        {label}
      </span>
    </Link>
  );
}

const AUTO_PX_PER_SEC = 18;
const RESUME_MS = 2200;

/** Bayilik şeridi: elle kaydırılabilir + yavaş otomatik sola kayma. */
export function HomeQuickLinksStrip() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const reduceMotionRef = useRef(false);
  const autoScrollingRef = useRef(false);

  const pauseAuto = useCallback(() => {
    if (autoScrollingRef.current) return;
    pausedRef.current = true;
    lastTsRef.current = null;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, RESUME_MS);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    reduceMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const onUserIntent = () => pauseAuto();
    scroller.addEventListener("wheel", onUserIntent, { passive: true });
    scroller.addEventListener("touchstart", onUserIntent, { passive: true });
    scroller.addEventListener("pointerdown", onUserIntent, { passive: true });
    scroller.addEventListener("scroll", onUserIntent, { passive: true });

    const tick = (ts: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (reduceMotionRef.current || pausedRef.current) {
        lastTsRef.current = ts;
        return;
      }
      const last = lastTsRef.current;
      lastTsRef.current = ts;
      if (last == null) return;

      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      if (maxScroll <= 1) return;

      const dt = Math.min(64, ts - last) / 1000;
      let next = scroller.scrollLeft + AUTO_PX_PER_SEC * dt;
      if (next >= maxScroll - 0.5) next = 0;
      autoScrollingRef.current = true;
      scroller.scrollLeft = next;
      // scroll event senkron; flag’i hemen kaldır
      autoScrollingRef.current = false;
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      scroller.removeEventListener("wheel", onUserIntent);
      scroller.removeEventListener("touchstart", onUserIntent);
      scroller.removeEventListener("pointerdown", onUserIntent);
      scroller.removeEventListener("scroll", onUserIntent);
    };
  }, [pauseAuto]);

  return (
    <div className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-[1400px] sm:px-4 md:px-6">
        <div
          ref={scrollerRef}
          className="flex gap-1.5 overflow-x-auto overscroll-x-contain px-2 py-1.5 touch-pan-x [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="list"
          aria-label="Bayilik kısayolları"
          onMouseEnter={pauseAuto}
        >
          {QUICK_ACCESS_LINKS.map((d) => (
            <div key={d.href} role="listitem">
              <QuickLinkItem href={d.href} label={d.label} image={d.image} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
