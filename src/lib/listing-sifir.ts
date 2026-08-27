import type { ListingRow } from "@/lib/listings-data";
import { parseListingDate } from "@/lib/listing-feature-boost";

/**
 * Sıfır araçlar vitrin paketleri — acil / öne çıkarma ile karıştırma.
 * Fiyatlar geçici; checkout gelince netleştirilir.
 */
export const SIFIR_PACKS = [
  {
    productId: "sifir_7d",
    days: 7,
    label: "7 gün",
    priceTry: 399,
    amountKurus: 39900,
  },
  {
    productId: "sifir_30d",
    days: 30,
    label: "30 gün",
    priceTry: 999,
    amountKurus: 99900,
  },
] as const;

export type SifirPack = (typeof SIFIR_PACKS)[number];

export function sifirProductIdForDays(days: number): string | null {
  return SIFIR_PACKS.find((p) => p.days === days)?.productId ?? null;
}

export function sifirPackForDays(days: number): SifirPack | null {
  return SIFIR_PACKS.find((p) => p.days === days) ?? null;
}

export function listingIsSifirActive(
  listing: Pick<ListingRow, "sifir_until">,
  now = new Date()
): boolean {
  const until = parseListingDate(listing.sifir_until);
  return until != null && until > now;
}
