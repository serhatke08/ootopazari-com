"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
 * Sayfa geçişlerinde üstte ince progress — tam ekran skeleton yok
 * (layout kayması / göz yorma önlenir).
 */
export function NavSkeletonGate() {
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  const show = Boolean(pendingPath && pendingPath !== pathname);

  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => setPendingPath(null), 8000);
    return () => window.clearTimeout(t);
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
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-0.5 overflow-hidden bg-zinc-200/40"
      aria-busy="true"
      aria-live="polite"
      role="progressbar"
    >
      <div className="nav-top-progress h-full w-1/3 rounded-r-full bg-[#ffcc00] shadow-[0_0_10px_rgba(255,204,0,0.65)]" />
    </div>,
    document.body
  );
}
