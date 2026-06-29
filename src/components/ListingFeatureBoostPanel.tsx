"use client";

import Link from "next/link";
import type { ListingRow } from "@/lib/listings-data";
import type { ListingBoostPaymentInfo } from "@/lib/feature-boost-payment-status";
import { boostPaymentStatusLabel } from "@/lib/feature-boost-payment-status";
import {
  featureBoostOwnerStatusCopy,
  formatFeatureBoostEndDisplay,
  listingFeatureBoostFields,
  listingFeatureBoostOwnerPhase,
} from "@/lib/listing-feature-boost";

type Props = {
  listing: ListingRow;
  listingLabel: string;
  canBoost: boolean;
  paymentInfo?: ListingBoostPaymentInfo | null;
};

const toneClasses = {
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  green: "border-emerald-200 bg-emerald-50 text-emerald-950",
  zinc: "border-zinc-200 bg-zinc-50 text-zinc-800",
} as const;

export function ListingFeatureBoostPanel({
  listing,
  canBoost,
  paymentInfo,
}: Props) {
  const phase = listingFeatureBoostOwnerPhase(listing);
  const status = featureBoostOwnerStatusCopy(listing);
  const { featuredUntil, packDays } = listingFeatureBoostFields(listing);
  const endDisplay = featuredUntil
    ? formatFeatureBoostEndDisplay(featuredUntil)
    : null;
  const purchasedLabel = boostPaymentStatusLabel(paymentInfo ?? undefined);
  const listingNumber =
    listing.listing_number != null
      ? String(listing.listing_number).trim()
      : "";
  const isActive =
    phase === "pulseActive" ||
    phase === "legacyActive" ||
    phase === "waitingNextPulse" ||
    phase === "packDaysDone";

  return (
    <div
      className={`mb-2 rounded-xl border px-3 py-3 sm:px-4 ${toneClasses[status.tone]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{status.title}</p>
          {status.detail ? (
            <p className="mt-1 text-xs leading-relaxed opacity-90">
              {status.detail}
            </p>
          ) : null}
        </div>
        {isActive ? (
          <span className="shrink-0 rounded-full bg-[#ffc400] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-black">
            {phase === "pulseActive" || phase === "legacyActive"
              ? "Aktif"
              : "Devam"}
          </span>
        ) : null}
      </div>

      {endDisplay ? (
        <div className="mt-3 rounded-lg border border-amber-200/60 bg-white/60 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/80">
            Kampanya bitişi
          </p>
          <p className="text-sm font-bold leading-snug">{endDisplay.dateLine}</p>
          <p className="text-xs font-semibold tabular-nums text-amber-900/90">
            saat {endDisplay.timeLine}
            {endDisplay.remainingLabel ? (
              <span className="ml-1.5 font-bold text-amber-700">
                · {endDisplay.remainingLabel}
              </span>
            ) : null}
          </p>
          {packDays > 0 ? (
            <p className="mt-1 text-[11px] text-zinc-600">
              {packDays} günlük pulse paketi
            </p>
          ) : null}
        </div>
      ) : null}

      {purchasedLabel ? (
        <p className="mt-2 text-xs font-medium">Son ödeme: {purchasedLabel}</p>
      ) : null}

      {canBoost && listingNumber ? (
        <Link
          href={`/ilan-one-cikar?listing=${encodeURIComponent(listingNumber)}`}
          className="mt-3 block w-full rounded-lg bg-[#ffc400] px-3 py-2.5 text-center text-xs font-extrabold text-black transition hover:bg-[#ffd24d] sm:text-sm"
        >
          {isActive ? "Süre ekle" : "Öne çıkar"}
        </Link>
      ) : null}
    </div>
  );
}
