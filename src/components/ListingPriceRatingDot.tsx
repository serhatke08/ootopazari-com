"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PRICE_RATING_OPTIONS,
  priceRatingIndicatorColor,
  summaryAfterVote,
  type PriceRatingSummary,
  type PriceRatingValue,
} from "@/lib/listing-price-ratings";

type Props = {
  listingId: string;
  summary: PriceRatingSummary;
  loggedIn: boolean;
  size?: "sm" | "md";
  popoverPlacement?: "above" | "below";
};

export function ListingPriceRatingDot({
  listingId,
  summary: initialSummary,
  loggedIn,
  size = "md",
  popoverPlacement = "above",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState(initialSummary);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSummary(initialSummary);
  }, [initialSummary]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const dotSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  const color = priceRatingIndicatorColor(summary.average, summary.count);

  const submitVote = useCallback(
    async (rating: PriceRatingValue) => {
      if (!loggedIn) {
        const path =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "/";
        window.location.href = `/giris?next=${encodeURIComponent(path)}`;
        return;
      }
      setPending(true);
      setError(null);
      try {
        const res = await fetch("/api/listings/price-rating", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId, rating }),
        });
        const body = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !body.ok) {
          setError(body.message ?? "Oy kaydedilemedi.");
          return;
        }
        setSummary((prev) => summaryAfterVote(prev, rating));
        setOpen(false);
        router.refresh();
      } catch {
        setError("Bağlantı kurulamadı.");
      } finally {
        setPending(false);
      }
    },
    [listingId, loggedIn, router]
  );

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex items-center justify-center rounded-full p-0.5 transition hover:ring-2 hover:ring-black/15 focus-visible:outline focus-visible:ring-2 focus-visible:ring-black/25"
        aria-label="Fiyat değerlendirmesi"
        aria-expanded={open}
      >
        <span
          className={`block rounded-full ${dotSize}`}
          style={{ backgroundColor: color }}
        />
      </button>

      {open ? (
        <div
          className={`absolute left-0 z-50 w-[min(17rem,calc(100vw-2rem))] rounded-xl border border-black/10 bg-white p-3 shadow-lg ${
            popoverPlacement === "below"
              ? "top-full mt-2"
              : "bottom-full mb-2"
          }`}
          role="dialog"
          aria-label="Fiyat değerlendir"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-semibold text-black">
            Fiyatı nasıl buldunuz?
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {PRICE_RATING_OPTIONS.map((opt) => {
              const active = summary.userRating === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={pending}
                  onClick={() => void submitVote(opt.value)}
                  className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-sm transition disabled:opacity-60 ${
                    active
                      ? "border-black/25 bg-black/[0.04] font-medium"
                      : "border-black/10 hover:border-black/20 hover:bg-black/[0.02]"
                  }`}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ backgroundColor: opt.color }}
                  />
                  <span className="text-black">{opt.label}</span>
                </button>
              );
            })}
          </div>
          {error ? (
            <p className="mt-2 text-xs text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
