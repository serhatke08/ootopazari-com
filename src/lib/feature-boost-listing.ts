import type { ListingRow } from "@/lib/listings-data";
import { isListingSuspended } from "@/lib/listings-data";
import {
  formatFeatureBoostDate,
  listingFeatureBoostFields,
  listingFeatureBoostOwnerPhase,
  type FeatureBoostOwnerPhase,
} from "@/lib/listing-feature-boost";

export type FeatureBoostListingOption = {
  id: string;
  listingNumber: string;
  title: string;
  coverImageUrl: string | null;
  price: number | null;
  cityName: string | null;
  moderationStatus: string;
  canBoost: boolean;
  blockReason: string | null;
  boostPhase: FeatureBoostOwnerPhase;
  featuredUntil: string | null;
  campaignStartAt: string | null;
  packDays: number;
  boostEndLabel: string | null;
  isBoostActive: boolean;
};

function moderationLabel(status: string): string {
  switch (status.toLowerCase()) {
    case "approved":
      return "Yayında";
    case "pending":
      return "Onay bekliyor";
    case "rejected":
      return "Reddedildi";
    case "suspended":
      return "Askıda";
    default:
      return status || "Bilinmiyor";
  }
}

export function featureBoostBlockReason(
  listing: ListingRow,
  now = new Date()
): string | null {
  const status = String(listing.moderation_status ?? "").toLowerCase();

  if (isListingSuspended(listing) || status === "suspended") {
    return "Askıya alınmış ilanlar öne çıkarılamaz.";
  }
  if (status === "pending") {
    return "İlan henüz onaylanmadı.";
  }
  if (status === "rejected") {
    return "Reddedilmiş ilan öne çıkarılamaz.";
  }
  if (status !== "approved") {
    return `İlan durumu: ${moderationLabel(status)}`;
  }

  return null;
}

export function buildFeatureBoostListingOption(
  listing: ListingRow,
  coverImageUrl: string | null,
  now = new Date()
): FeatureBoostListingOption | null {
  const id = listing.id != null ? String(listing.id).trim() : "";
  const listingNumber =
    listing.listing_number != null ? String(listing.listing_number).trim() : "";
  if (!id || !listingNumber) return null;

  const blockReason = featureBoostBlockReason(listing, now);
  const boostPhase = listingFeatureBoostOwnerPhase(listing, now);
  const { featuredUntil, campaignStart, packDays } = listingFeatureBoostFields(listing);
  const isBoostActive =
    boostPhase === "pulseActive" ||
    boostPhase === "legacyActive" ||
    boostPhase === "waitingNextPulse" ||
    boostPhase === "packDaysDone";
  const priceRaw = Number(listing.price);

  return {
    id,
    listingNumber,
    title: String(listing.title ?? "İlan").trim() || "İlan",
    coverImageUrl,
    price: Number.isFinite(priceRaw) ? priceRaw : null,
    cityName:
      listing.city_name != null && String(listing.city_name).trim() !== ""
        ? String(listing.city_name).trim()
        : null,
    moderationStatus: String(listing.moderation_status ?? ""),
    canBoost: blockReason == null,
    blockReason,
    boostPhase,
    featuredUntil: featuredUntil?.toISOString() ?? null,
    campaignStartAt: campaignStart?.toISOString() ?? null,
    packDays,
    boostEndLabel: featuredUntil ? formatFeatureBoostDate(featuredUntil) : null,
    isBoostActive,
  };
}
