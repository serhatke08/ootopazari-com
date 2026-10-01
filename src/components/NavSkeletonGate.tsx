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

/**
 * Link tıklanınca içerik alanını markalı placeholder ile tutar —
 * footer navbar’a yapışmaz. Üstte ince progress.
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
    const measure = () => {
      const header = document.querySelector("header");
      const footer = document.querySelector("footer");
      const bottomNav = document.querySelector('[data-mobile-bottom-nav="true"]');
      const top = header
        ? Math.ceil(header.getBoundingClientRect().bottom)
        : 72;
      let bottom = 0;
      if (footer) {
        const fr = footer.getBoundingClientRect();
        bottom = Math.max(0, window.innerHeight - fr.top);
      }
      if (bottomNav) {
        const br = bottomNav.getBoundingClientRect();
        bottom = Math.max(bottom, window.innerHeight - br.top);
      }
      setMainTop(top);
      setMainBottom(bottom);
    };
    measure();
    window.addEventListener("resize", measure);
    const t = window.setTimeout(() => setPendingPath(null), 10000);
    return () => {
      window.removeEventListener("resize", measure);
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
        className="fixed inset-x-0 z-[34] overflow-hidden bg-zinc-50"
        style={{ top: mainTop, bottom: mainBottom }}
        aria-busy="true"
        aria-live="polite"
      >
        <BrandPagePlaceholder className="h-full" />
      </div>
    </>,
    document.body
  );
}
