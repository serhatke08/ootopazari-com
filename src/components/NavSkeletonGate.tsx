"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { skeletonForPath } from "@/components/skeletons/PageSkeletons";

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
 * Dahili link tıklanınca sunucu cevabı gelene kadar iskelet gösterir.
 * Mobil alt menü ve sayfa geçişlerinde boş/beyaz ekranı önler.
 */
export function NavSkeletonGate() {
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [skeleton, setSkeleton] = useState<ReactNode>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPendingPath(null);
    setSkeleton(null);
  }, [pathname]);

  const show = Boolean(pendingPath && pendingPath !== pathname);

  useEffect(() => {
    if (!show) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [show]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const href = internalHrefFromClick(e.target);
      if (!href) return;
      const current = window.location.pathname;
      if (href === current) return;
      setPendingPath(href);
      setSkeleton(skeletonForPath(href));
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!mounted || !show || !skeleton) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[35] overflow-y-auto overscroll-contain bg-zinc-50"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="min-h-[100dvh] bg-zinc-50">{skeleton}</div>
    </div>,
    document.body
  );
}
