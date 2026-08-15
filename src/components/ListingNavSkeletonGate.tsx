"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ListingDetailSkeleton } from "@/components/ListingDetailSkeleton";

function listingHrefFromClick(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const a = target.closest("a");
  if (!a) return null;
  if (a.target === "_blank") return null;
  const href = a.getAttribute("href");
  if (!href || !href.startsWith("/ilan/")) return null;
  return href.split("?")[0] ?? null;
}

/**
 * İlan kartına basınca sunucu cevabı gelene kadar iskeleti hemen gösterir.
 * Route-level `loading.tsx` kullanmıyoruz: o dosya 308/404'ü 200'e çeviriyordu.
 */
export function ListingNavSkeletonGate() {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const show = Boolean(pendingHref && pendingHref !== pathname);

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
      const href = listingHrefFromClick(e.target);
      if (!href) return;
      const current = window.location.pathname;
      if (href === current) return;
      setPendingHref(href);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!mounted || !show) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[35] overflow-y-auto overscroll-contain bg-white"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="min-h-[100dvh] bg-white">
        <ListingDetailSkeleton />
      </div>
    </div>,
    document.body
  );
}
