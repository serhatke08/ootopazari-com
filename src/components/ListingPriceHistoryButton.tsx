"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/hooks/use-is-client";
import {
  formatListingPriceTry,
  formatPriceHistoryDate,
  type PriceHistoryEntry,
} from "@/lib/listing-price-history";
import { PRICE_RATING_OPTIONS } from "@/lib/listing-price-ratings";

type AnchorRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type Props = {
  history: PriceHistoryEntry[];
  popoverPlacement?: "above" | "below";
  overlay?: boolean;
};

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

export function ListingPriceHistoryButton({
  history,
  popoverPlacement = "below",
  overlay = false,
}: Props) {
  const mounted = useIsClient();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updateAnchor = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setAnchor({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateAnchor();

    function onScrollOrResize() {
      updateAnchor();
    }
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    let removeDocListeners: (() => void) | null = null;
    const timer = window.setTimeout(() => {
      function onDoc(e: MouseEvent) {
        const t = e.target as Node;
        if (btnRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
        setOpen(false);
      }
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("touchstart", onDoc as EventListener);
      removeDocListeners = () => {
        document.removeEventListener("mousedown", onDoc);
        document.removeEventListener("touchstart", onDoc as EventListener);
      };
    }, 0);

    return () => {
      window.clearTimeout(timer);
      removeDocListeners?.();
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updateAnchor]);

  const toggleOpen = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!open) updateAnchor();
      setOpen((o) => !o);
    },
    [open, updateAnchor]
  );

  const popoverStyle: React.CSSProperties | undefined = anchor
    ? popoverPlacement === "below"
      ? {
          position: "fixed",
          top: anchor.top + anchor.height + 8,
          left: Math.min(anchor.left, window.innerWidth - 300),
          zIndex: 300,
        }
      : {
          position: "fixed",
          top: anchor.top - 8,
          left: Math.min(anchor.left, window.innerWidth - 300),
          transform: "translateY(-100%)",
          zIndex: 300,
        }
    : undefined;

  const popover =
    open && anchor ? (
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-black/10 bg-white p-3 shadow-xl"
        role="dialog"
        aria-label="Fiyat geçmişi"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-black">Fiyat geçmişi</p>
        {history.length === 0 ? (
          <p className="mt-2 text-xs text-black/55">
            Henüz fiyat değişikliği kaydı yok.
          </p>
        ) : (
          <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-black/8 bg-black/[0.02] px-2.5 py-2"
              >
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.indicatorColor }}
                    title="O dönemdeki fiyat değerlendirmesi"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold tabular-nums text-black">
                      {formatListingPriceTry(entry.price)}
                    </p>
                    <p className="text-[11px] text-black/50">
                      {formatPriceHistoryDate(entry.recordedAt)}
                    </p>
                    {entry.ratingCount > 0 ? (
                      <p className="mt-1 text-[10px] leading-relaxed text-black/60">
                        {PRICE_RATING_OPTIONS.map((opt) => (
                          <span key={opt.value} className="mr-2 inline-block">
                            {opt.shortLabel}: {entry.counts[opt.countKey]}
                          </span>
                        ))}
                      </p>
                    ) : (
                      <p className="mt-1 text-[10px] text-black/45">
                        Oylama yoktu
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    ) : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={toggleOpen}
        className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition hover:bg-black/5 focus-visible:outline focus-visible:ring-2 focus-visible:ring-black/25 ${
          overlay ? "text-white/90 hover:bg-white/15" : "text-black/55 hover:text-black/75"
        }`}
        aria-label="Fiyat geçmişi"
        aria-expanded={open}
      >
        <HistoryIcon className="h-4 w-4" />
      </button>
      {mounted && popover ? createPortal(popover, document.body) : null}
    </>
  );
}
