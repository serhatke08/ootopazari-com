"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/hooks/use-is-client";
import {
  appStoreUrl,
  detectMobileStore,
  playStoreUrl,
  storeLabelForKind,
  storeUrlForKind,
  type MobileStoreKind,
} from "@/lib/app-stores";

const STORAGE_KEY = "oto_app_download_promo_dismissed_at";
const DISMISS_MS = 3 * 24 * 60 * 60 * 1000; // 3 gün
const SHOW_DELAY_MS = 900;

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

  const primaryHref = storeUrlForKind(store);
  const primaryLabel = storeLabelForKind(store);
  const showBoth = store === "other";

  return createPortal(
    <div
      className="fixed inset-0 z-[160] flex items-end justify-center bg-black/55 p-3 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-download-promo-title"
      onClick={close}
    >
      <div
        className="relative w-full max-w-[22rem] overflow-hidden rounded-2xl bg-[#ffcc00] shadow-2xl ring-1 ring-black/10"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Kapat"
          className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-lg font-light leading-none text-white transition hover:bg-black/70"
        >
          ×
        </button>

        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#ffcc00]">
          <Image
            src="/promo/app-download.jpg"
            alt="Oto Pazarı mobil uygulaması"
            fill
            priority
            sizes="(max-width: 480px) 90vw, 352px"
            className="object-cover object-[center_12%]"
          />
        </div>

        <div className="space-y-2.5 border-t border-black/10 bg-[#ffcc00] px-3 pb-3 pt-2.5">
          <p
            id="app-download-promo-title"
            className="text-center text-sm font-extrabold uppercase tracking-wide text-black"
          >
            Uygulamamızı indirin
          </p>

          {showBoth ? (
            <div className="grid grid-cols-2 gap-2">
              <a
                href={appStoreUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="inline-flex items-center justify-center rounded-xl bg-black px-3 py-2.5 text-center text-xs font-bold text-white transition hover:bg-zinc-800"
              >
                App Store
              </a>
              <a
                href={playStoreUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="inline-flex items-center justify-center rounded-xl bg-black px-3 py-2.5 text-center text-xs font-bold text-white transition hover:bg-zinc-800"
              >
                Google Play
              </a>
            </div>
          ) : (
            <a
              href={primaryHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="flex w-full items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-zinc-800"
            >
              {primaryLabel}
            </a>
          )}

          <button
            type="button"
            onClick={close}
            className="w-full py-1 text-center text-xs font-medium text-black/55 transition hover:text-black"
          >
            Şimdi değil
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
