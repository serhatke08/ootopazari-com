"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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
      className={`sticky top-0 z-40 shrink-0 border-b border-zinc-200 bg-zinc-100 pt-[env(safe-area-inset-top,0px)] shadow-sm ${
        hideOnMobileListing ? "hidden md:block" : ""
      }`}
      aria-busy="true"
      aria-label="Menü yükleniyor"
    >
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
    </header>
  );
}

/** Ana sayfa mobil: iç kaydırma — tarayıcı URL çubuğu davranışı */
function useMobileHomeScrollMode() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 47.999rem)");
    const sync = () => setEnabled(isHome && mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [isHome]);

  useEffect(() => {
    const root = document.documentElement;
    if (enabled) {
      root.classList.add("mobile-home-scroll-mode");
    } else {
      root.classList.remove("mobile-home-scroll-mode");
    }
    return () => root.classList.remove("mobile-home-scroll-mode");
  }, [enabled]);

  return enabled;
}

function useMobileChromeMode() {
  const pathname = usePathname();
  const hideBottomNav = isListingDetailPath(pathname);

  useEffect(() => {
    const root = document.documentElement;
    if (hideBottomNav) {
      root.classList.add("mobile-hide-bottom-nav");
    } else {
      root.classList.remove("mobile-hide-bottom-nav");
    }
    return () => root.classList.remove("mobile-hide-bottom-nav");
  }, [hideBottomNav]);
}

export function SiteMainShell({ children }: { children: ReactNode }) {
  const mobileHomeScroll = useMobileHomeScrollMode();
  useMobileChromeMode();

  if (mobileHomeScroll) {
    return (
      <div className="layout-with-mobile-nav flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mobile-home-scroll-pane min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="layout-with-mobile-nav flex flex-1 flex-col">{children}</div>
  );
}
