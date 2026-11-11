"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  homeShortcutFromHref,
  type HomeShortcutGlyph,
} from "@/lib/home-shortcuts";
import { HomeShortcutGlyphIcon } from "@/components/home/HomeShortcutGlyph";

type Reveal = {
  href: string;
  x: number;
  y: number;
  start: number;
  end: number;
  color: string;
  logoSrc?: string;
  glyph?: HomeShortcutGlyph;
  label: string;
};

const EXPAND_MS = 820;
const FADE_MS = 220;
const EVENT = "otopazar-dealer-circle";

function coverRadius(x: number, y: number) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return Math.max(
    Math.hypot(0 - x, 0 - y),
    Math.hypot(w - x, 0 - y),
    Math.hypot(0 - x, h - y),
    Math.hypot(w - x, h - y)
  );
}

function buildReveal(href: string, originEl: HTMLElement | null): Reveal | null {
  const shortcut = homeShortcutFromHref(href);
  if (!shortcut) return null;
  const rect = originEl?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : 80;
  const start = rect ? Math.max(rect.width, rect.height) / 2 : 18;
  return {
    href,
    x,
    y,
    start,
    end: coverRadius(x, y) + 32,
    color: shortcut.fillColor,
    logoSrc: shortcut.image,
    glyph: shortcut.glyph,
    label: shortcut.label,
  };
}

export function startDealerCircle(href: string, originEl: HTMLElement | null) {
  window.dispatchEvent(
    new CustomEvent(EVENT, { detail: { href, originEl } })
  );
}

export function useDealerCircleNav() {
  const router = useRouter();
  const go = useCallback(
    (href: string, originEl: HTMLElement | null) => {
      if (!homeShortcutFromHref(href)) {
        router.push(href);
        return;
      }
      startDealerCircle(href, originEl);
    },
    [router]
  );
  return { go, overlay: null as React.ReactNode };
}

export function DealerCircleOverlay() {
  const router = useRouter();
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    const onGo = (event: Event) => {
      const { href, originEl } = (
        event as CustomEvent<{ href: string; originEl: HTMLElement | null }>
      ).detail;
      if (busyRef.current) return;
      const next = buildReveal(href, originEl);
      if (!next) {
        router.push(href);
        return;
      }
      busyRef.current = true;
      setReveal(next);
    };
    window.addEventListener(EVENT, onGo);
    return () => window.removeEventListener(EVENT, onGo);
  }, [router]);

  useEffect(() => {
    if (!reveal) return;
    const layer = layerRef.current;
    if (!layer) return;

    layer.style.opacity = "1";
    layer.style.transition = "none";
    layer.style.clipPath = `circle(${reveal.start}px at ${reveal.x}px ${reveal.y}px)`;
    void layer.offsetWidth;
    layer.style.transition = `clip-path ${EXPAND_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`;
    layer.style.clipPath = `circle(${reveal.end}px at ${reveal.x}px ${reveal.y}px)`;

    const navTimer = window.setTimeout(() => {
      router.push(reveal.href);
    }, Math.round(EXPAND_MS * 0.62));

    const fadeTimer = window.setTimeout(() => {
      layer.style.transition = `opacity ${FADE_MS}ms ease-out`;
      layer.style.opacity = "0";
      layer.style.pointerEvents = "none";
    }, EXPAND_MS + 60);

    const clearTimer = window.setTimeout(() => {
      setReveal(null);
      busyRef.current = false;
    }, EXPAND_MS + 60 + FADE_MS);

    return () => {
      window.clearTimeout(navTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [reveal, router]);

  if (!reveal) return null;

  return (
    <div
      ref={layerRef}
      className="fixed inset-0 z-[90]"
      style={{ backgroundColor: reveal.color }}
      aria-hidden
    >
      <div className="flex h-full w-full flex-col items-center justify-center">
        {reveal.logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reveal.logoSrc}
            alt=""
            className="h-24 w-24 rounded-full object-cover shadow-2xl ring-4 ring-white/25 sm:h-28 sm:w-28"
          />
        ) : reveal.glyph ? (
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white/15 text-white ring-4 ring-white/25 sm:h-28 sm:w-28">
            <HomeShortcutGlyphIcon name={reveal.glyph} className="h-12 w-12" />
          </span>
        ) : null}
        <p className="mt-5 px-6 text-center text-3xl font-black uppercase tracking-[0.12em] text-white">
          {reveal.label}
        </p>
      </div>
    </div>
  );
}
