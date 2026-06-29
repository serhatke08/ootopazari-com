"use client";

import { useState } from "react";
import type { ListingRow } from "@/lib/listings-data";
import {
  WEBSITE_FEATURE_BOOST_PACKS,
  featureBoostOwnerStatusCopy,
  formatTryPrice,
  listingFeatureBoostOwnerPhase,
} from "@/lib/listing-feature-boost";
import { FeatureBoostPackagesDialog } from "@/components/FeatureBoostPackagesDialog";

type Props = {
  listing: ListingRow;
  listingLabel: string;
  canBoost: boolean;
};

const toneClasses = {
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  green: "border-emerald-200 bg-emerald-50 text-emerald-950",
  zinc: "border-zinc-200 bg-zinc-50 text-zinc-800",
} as const;

export function ListingFeatureBoostPanel({
  listing,
  listingLabel,
  canBoost,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const phase = listingFeatureBoostOwnerPhase(listing);
  const status = featureBoostOwnerStatusCopy(listing);
  const showBoostButton =
    canBoost && phase !== "pulseActive" && phase !== "legacyActive";

  return (
    <>
      <div
        className={`mb-2 rounded-lg border px-3 py-2 ${toneClasses[status.tone]}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold">{status.title}</p>
            {status.detail ? (
              <p className="mt-0.5 text-[11px] leading-snug opacity-90">
                {status.detail}
              </p>
            ) : null}
          </div>
          {phase === "pulseActive" || phase === "legacyActive" ? (
            <span className="shrink-0 rounded-full bg-[#ffc400] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-black">
              Aktif
            </span>
          ) : null}
        </div>
        {showBoostButton ? (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="mt-2 w-full rounded-lg bg-[#ffc400] px-3 py-2 text-xs font-extrabold text-black transition hover:bg-[#ffd24d]"
          >
            Öne çıkar
          </button>
        ) : null}
      </div>

      <FeatureBoostPackagesDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        listingLabel={listingLabel}
        packs={WEBSITE_FEATURE_BOOST_PACKS.map((pack) => ({
          ...pack,
          priceLabel: formatTryPrice(pack.fallbackPriceTry),
        }))}
      />
    </>
  );
}
