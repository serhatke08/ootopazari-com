import type { ListingRow } from "@/lib/listings-data";
import { parseListingDate } from "@/lib/listing-feature-boost";

/** Acil paketleri — öne çıkarma (feature_boost) ile karıştırma. */
export const ACIL_PACKS = [
  {
    productId: "acil_5d",
    days: 5,
    label: "5 gün",
    priceTry: 289,
    amountKurus: 28900,
  },
  {
    productId: "acil_15d",
    days: 15,
    label: "15 gün",
    priceTry: 620,
    amountKurus: 62000,
  },
] as const;

export type AcilPack = (typeof ACIL_PACKS)[number];

export function acilProductIdForDays(days: number): string | null {
  return ACIL_PACKS.find((p) => p.days === days)?.productId ?? null;
}

export function acilPackForDays(days: number): AcilPack | null {
  return ACIL_PACKS.find((p) => p.days === days) ?? null;
}

export function listingIsAcilActive(
  listing: Pick<ListingRow, "acil_until">,
  now = new Date()
): boolean {
  const until = parseListingDate(listing.acil_until);
  return until != null && until > now;
}
