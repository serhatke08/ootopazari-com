"use client";

import { useCallback, useMemo, useState } from "react";
import { CenteredDialog } from "@/components/CenteredDialog";
import {
  formatListingPriceTry,
  formatPriceHistoryDate,
  listingPriceHistoryChanges,
  listingPriceHistoryHasChanges,
  listingPriceHistoryInitial,
  type PriceHistoryEntry,
} from "@/lib/listing-price-history";

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

  const hasChanges = useMemo(
    () => listingPriceHistoryHasChanges(history),
    [history]
  );
  const initial = useMemo(
    () => listingPriceHistoryInitial(history),
    [history]
  );
  const changes = useMemo(
    () => listingPriceHistoryChanges(history),
    [history]
  );

  const dialog = open ? (
    <CenteredDialog
      title="Fiyat geçmişi"
      titleId="price-history-dialog-title"
      onClose={close}
    >
      {!hasChanges || !initial ? (
        <p className="text-sm text-black/55">
          Henüz fiyat değişikliği olmadı.
        </p>
      ) : (
        <div className="max-h-64 space-y-2.5 overflow-y-auto">
          <div className="rounded-lg border border-black/8 bg-black/[0.02] px-3 py-2.5">
            <p className="text-[11px] font-semibold text-black/50">İlk fiyat</p>
            <p className="mt-0.5 text-lg font-extrabold tabular-nums text-black">
              {formatListingPriceTry(initial.price)}
            </p>
          </div>

          <ul className="space-y-2">
            {changes.map((change) => (
              <li
                key={`${change.from.id}-${change.to.id}`}
                className="rounded-lg border border-black/8 bg-black/[0.02] px-3 py-2.5"
              >
                <p className="text-[11px] text-black/50">
                  {formatPriceHistoryDate(change.to.recordedAt)}
                </p>
                <div className="mt-1.5 flex min-w-0 items-center gap-2.5">
                  <span className="truncate text-sm tabular-nums text-black/55 line-through decoration-black/35">
                    {formatListingPriceTry(change.from.price)}
                  </span>
                  <span className="shrink-0 font-bold text-black/35" aria-hidden>
                    —
                  </span>
                  <span className="truncate text-sm font-extrabold tabular-nums text-black">
                    {formatListingPriceTry(change.to.price)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
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
