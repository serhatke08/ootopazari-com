"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { isListingDetailPath } from "@/lib/listing-seo";

function Pulse({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-zinc-300/80 ${className}`} />
  );
}

/** Navbar boyutunu korur; skeleton’da sarı yok. */
export function SiteHeaderFallback() {
  const pathname = usePathname();
  const hideOnMobileListing = isListingDetailPath(pathname);

  return (
    <header
      className={`sticky top-0 z-40 shrink-0 shadow-sm ${
        hideOnMobileListing ? "hidden md:block" : ""
      }`}
      aria-busy="true"
      aria-label="Menü yükleniyor"
    >
      <div
        className="h-[env(safe-area-inset-top,0px)] shrink-0 md:hidden"
        aria-hidden
      />
      <div className="border-b border-zinc-200 bg-zinc-100">
      <div className="mx-auto max-w-[1400px] px-2 py-1.5 sm:px-4 sm:py-2.5 md:px-6">
        <div className="grid h-10 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 sm:h-11 sm:grid-cols-[minmax(12rem,1fr)_auto_minmax(13rem,1fr)] sm:gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Pulse className="h-9 w-9 shrink-0" />
            <Pulse className="hidden h-9 w-full max-w-[280px] sm:block md:max-w-[340px] lg:max-w-[420px]" />
          </div>

          <Pulse className="mx-auto h-6 w-28 justify-self-center sm:h-7 sm:w-36 md:h-8 md:w-40" />

          <nav className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
            <Pulse className="h-9 w-9 sm:hidden" />
            <Pulse className="hidden h-9 w-[4.75rem] md:block" />
            <Pulse className="hidden h-9 w-[4.75rem] md:block" />
            <Pulse className="hidden h-9 w-16 lg:block" />
            <Pulse className="h-9 w-9 shrink-0" />
            <Pulse className="h-8 w-8 shrink-0 rounded-full" />
          </nav>
        </div>
      </div>
      </div>
    </header>
  );
}

export function SiteMainShell({ children }: { children: ReactNode }) {
  return (
    <div className="layout-with-mobile-nav flex min-h-0 flex-1 flex-col">
      <div className="mobile-shell-scroll flex min-h-0 flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
