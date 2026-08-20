"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isListingDetailPath } from "@/lib/listing-seo";

function Pulse({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-black/10 ${className}`} />
  );
}

/** SiteHeader ile aynı grid / boşluklar — Suspense yüklenirken ezilmesin. */
export function SiteHeaderFallback() {
  const pathname = usePathname();
  const hideOnMobileListing = isListingDetailPath(pathname);

  return (
    <header
      className={`sticky top-0 z-40 border-b border-amber-400/80 bg-[#ffcc00] shadow-sm ${
        hideOnMobileListing ? "hidden md:block" : ""
      }`}
      aria-busy="true"
      aria-label="Menü yükleniyor"
    >
      <div className="mx-auto max-w-[1400px] px-2 py-1.5 sm:px-4 sm:py-2.5 md:px-6">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 sm:grid-cols-[minmax(12rem,1fr)_auto_minmax(13rem,1fr)] sm:gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Pulse className="h-9 w-9 shrink-0 rounded-md" />
            <div className="hidden min-w-0 flex-1 sm:block sm:max-w-[280px] md:max-w-[340px] lg:max-w-[420px]">
              <Pulse className="h-9 w-full rounded-md" />
            </div>
          </div>

          <div className="justify-self-center px-1 py-0.5">
            <Pulse className="mx-auto h-6 w-28 sm:h-7 sm:w-36 md:h-8 md:w-40" />
          </div>

          <nav className="flex min-w-0 items-center justify-end gap-x-1 gap-y-1 sm:gap-x-2 md:gap-x-2 lg:gap-x-3">
            <Pulse className="h-9 w-9 rounded-md sm:hidden" />
            <Pulse className="hidden h-8 w-[4.5rem] rounded-md md:block lg:h-9 lg:w-20" />
            <Pulse className="hidden h-8 w-20 rounded-md md:block lg:h-9 lg:w-24" />
            <Pulse className="hidden h-8 w-16 rounded-md lg:block" />
            <Pulse className="h-9 w-9 shrink-0 rounded-md" />
            <Pulse className="h-8 w-8 shrink-0 rounded-full" />
          </nav>
        </div>
      </div>
    </header>
  );
}

export function SiteMainShell({ children }: { children: ReactNode }) {
  return <div className="layout-with-mobile-nav flex flex-1 flex-col">{children}</div>;
}
