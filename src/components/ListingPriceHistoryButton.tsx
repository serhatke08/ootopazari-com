"use client";

import { useCallback, useState } from "react";
import { CenteredDialog } from "@/components/CenteredDialog";
import {
  formatListingPriceTry,
  formatPriceHistoryDate,
  type PriceHistoryEntry,
} from "@/lib/listing-price-history";
import { PRICE_RATING_OPTIONS } from "@/lib/listing-price-ratings";

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
  overlay = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const toggleOpen = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((o) => !o);
  }, []);

  const dialog = open ? (
    <CenteredDialog
      title="Fiyat geçmişi"
      titleId="price-history-dialog-title"
      onClose={close}
    >
      {history.length === 0 ? (
        <p className="text-sm text-black/55">
          Henüz fiyat değişikliği kaydı yok.
        </p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto">
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
    </CenteredDialog>
  ) : null;

  return (
    <>
      <button
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
      {dialog}
    </>
  );
}
