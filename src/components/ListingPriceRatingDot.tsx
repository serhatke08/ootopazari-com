"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CenteredDialog } from "@/components/CenteredDialog";
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
  framed?: boolean;
  popoverPlacement?: "above" | "below";
};

export function ListingPriceRatingDot({
  listingId,
  summary: initialSummary,
  loggedIn,
  size = "md",
  framed = false,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState(initialSummary);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSummary(initialSummary);
  }, [initialSummary]);

  const close = useCallback(() => setOpen(false), []);

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

  const toggleOpen = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((o) => !o);
  }, []);

  const dialog = open ? (
    <CenteredDialog
      title="Fiyatı nasıl buldunuz?"
      titleId="price-rating-dialog-title"
      onClose={close}
    >
      <div className="flex flex-col gap-2">
        {PRICE_RATING_OPTIONS.map((opt) => {
          const active = summary.userRating === opt.value;
          const voteCount = summary.counts[opt.countKey];
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
              <span className="flex min-w-0 flex-1 items-center justify-between gap-2 text-black">
                <span>{opt.label}</span>
                <span className="shrink-0 text-xs tabular-nums text-black/45">
                  {voteCount}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {summary.count > 0 ? (
        <p className="mt-3 border-t border-black/10 pt-2 text-[11px] text-black/55">
          Toplam {summary.count} oy · Makul {summary.counts.fair} · Biraz
          pahalı {summary.counts.expensive} · Fahiş {summary.counts.exorbitant}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </CenteredDialog>
  ) : null;

  return (
    <>
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={toggleOpen}
        className={
          framed
            ? "relative z-10 inline-flex h-8 items-center justify-center rounded-md border border-black/20 bg-white/45 px-2 backdrop-blur-[2px] transition hover:bg-white/70 focus-visible:outline focus-visible:ring-2 focus-visible:ring-black/25"
            : `relative z-10 flex shrink-0 items-center justify-center rounded-full transition hover:bg-black/5 focus-visible:outline focus-visible:ring-2 focus-visible:ring-black/25 ${
                size === "sm" ? "h-4 w-4" : "h-7 w-7"
              }`
        }
        aria-label="Fiyat anketi"
        title="Fiyat anketi"
        aria-expanded={open}
      >
        <span
          className={`block rounded-full ${framed ? "h-3.5 w-3.5" : dotSize}`}
          style={{ backgroundColor: color }}
        />
      </button>
      {dialog}
    </>
  );
}
