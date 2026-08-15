"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

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

  if (!pendingHref || pendingHref === pathname) return null;

  return (
    <div
      className="fixed inset-x-0 top-14 bottom-0 z-30 overflow-y-auto bg-white md:top-[4.25rem]"
      aria-busy="true"
      aria-live="polite"
    >
      <ListingDetailSkeleton />
    </div>
  );
}
