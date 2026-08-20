"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/hooks/use-is-client";
import {
  appStoreUrl,
  detectMobileStore,
  playStoreUrl,
  storeUrlForKind,
  type MobileStoreKind,
} from "@/lib/app-stores";

const STORAGE_KEY = "oto_app_download_promo_dismissed_at";
const DISMISS_MS = 3 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 700;

function wasRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function AppDownloadPromoPopup() {
  const mounted = useIsClient();
  const [open, setOpen] = useState(false);
  const [store, setStore] = useState<MobileStoreKind>("other");

  useEffect(() => {
    if (!mounted) return;
    if (wasRecentlyDismissed()) return;
    setStore(detectMobileStore(navigator.userAgent));
    const t = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [mounted]);

  const close = useCallback(() => {
    markDismissed();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!mounted || !open) return null;

  const href = storeUrlForKind(store);
  const desktop = store === "other";

  return createPortal(
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Oto Pazarı uygulamasını indir"
      onClick={close}
    >
      <div
        className="relative w-full max-w-[min(100%,20.5rem)] origin-center opacity-100 [animation:app-promo-in_220ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Kapat"
          className="absolute -right-1.5 -top-1.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black text-base font-light leading-none text-white shadow-lg ring-2 ring-white/90 transition hover:bg-zinc-800"
        >
          ×
        </button>

        <div className="relative overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] ring-1 ring-black/15">
          {desktop ? (
            <>
              <Image
                src="/promo/app-download.jpg"
                alt="Oto Pazarı mobil uygulaması"
                width={682}
                height={1024}
                priority
                className="block h-auto w-full"
                sizes="328px"
              />
              <a
                href={playStoreUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                aria-label="Google Play’den indir"
                className="absolute bottom-[3.5%] left-[8%] h-[9.5%] w-[40%] rounded-md"
              />
              <a
                href={appStoreUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                aria-label="App Store’dan indir"
                className="absolute bottom-[3.5%] right-[8%] h-[9.5%] w-[40%] rounded-md"
              />
            </>
          ) : (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="block"
              aria-label={
                store === "ios"
                  ? "App Store’dan Oto Pazarı’nı indir"
                  : "Google Play’den Oto Pazarı’nı indir"
              }
            >
              <Image
                src="/promo/app-download.jpg"
                alt="Oto Pazarı mobil uygulaması"
                width={682}
                height={1024}
                priority
                className="block h-auto w-full"
                sizes="328px"
              />
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
