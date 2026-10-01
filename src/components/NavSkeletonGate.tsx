"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BrandPagePlaceholder } from "@/components/BrandPagePlaceholder";

function internalHrefFromClick(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const a = target.closest("a");
  if (!a) return null;
  if (a.target === "_blank") return null;
  const href = a.getAttribute("href");
  if (!href || !href.startsWith("/")) return null;
  if (href.startsWith("//")) return null;
  return href.split("?")[0] ?? href;
}

/** Header altı + mobil alt nav üstü. Footer ASLA ölçülmez (içerik boşalınca yukarı zıplar). */
function measureChromeInsets(): { top: number; bottom: number } {
  const header = document.querySelector("header");
  const bottomNav = document.querySelector('[data-mobile-bottom-nav="true"]');
  const top = header
    ? Math.ceil(header.getBoundingClientRect().bottom)
    : 72;
  let bottom = 0;
  if (bottomNav) {
    const br = bottomNav.getBoundingClientRect();
    if (br.height > 0 && br.top < window.innerHeight) {
      bottom = Math.max(0, Math.ceil(window.innerHeight - br.top));
    }
  }
  return { top, bottom };
}

/**
 * Link tıklanınca hemen marka animasyonu — footer navbar’a yapışmaz.
 * Üstte ince progress.
 */
export function NavSkeletonGate() {
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mainTop, setMainTop] = useState(72);
  const [mainBottom, setMainBottom] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  const show = Boolean(pendingPath && pendingPath !== pathname);

  useEffect(() => {
    if (!show) return;
    const onResize = () => {
      const { top, bottom } = measureChromeInsets();
      setMainTop(top);
      setMainBottom(bottom);
    };
    onResize();
    window.addEventListener("resize", onResize);
    const t = window.setTimeout(() => setPendingPath(null), 12000);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(t);
    };
  }, [show]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const href = internalHrefFromClick(e.target);
      if (!href) return;
      const current = window.location.pathname;
      if (href === current) return;
      // İçerik boşalmadan önce ölç — footer zıplamadan overlay sabit kalsın
      const { top, bottom } = measureChromeInsets();
      setMainTop(top);
      setMainBottom(bottom);
      setPendingPath(href);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!mounted || !show) return null;

  return createPortal(
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-0.5 overflow-hidden bg-zinc-200/40"
        aria-busy="true"
        role="progressbar"
      >
        <div className="nav-top-progress h-full w-1/3 rounded-r-full bg-[#ffcc00] shadow-[0_0_10px_rgba(255,204,0,0.65)]" />
      </div>
      <div
        className="fixed inset-x-0 z-[34] flex flex-col overflow-hidden bg-zinc-50"
        style={{ top: mainTop, bottom: mainBottom }}
        aria-busy="true"
        aria-live="polite"
      >
        <BrandPagePlaceholder fill />
      </div>
    </>,
    document.body
  );
}
