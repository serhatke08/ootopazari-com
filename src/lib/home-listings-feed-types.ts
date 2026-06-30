import type { ListingPublicStats } from "@/lib/listing-stats";
import type { PriceRatingSummary } from "@/lib/listing-price-ratings";
import type { ListingRow } from "@/lib/listings-data";

export const HOME_LISTINGS_PAGE_SIZE = 30;

export type HomeListingCardItem = {
  listing: ListingRow;
  categoryName: string | null;
  cityDisplayName: string | null;
  stats: ListingPublicStats | null;
  favorited: boolean;
  ownerName: string | null;
  ownerAvatarSrc: string | null;
  ownerHref: string | null;
  priceRating: PriceRatingSummary;
};

export type HomeListingsFeedFilters = {
  categoryId?: string;
  cityId?: string;
  vehicleBrandId?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  minKm?: number;
  maxKm?: number;
  q?: string;
  vehicleModel?: string;
  bodyType?: string;
  vehicleEnginePackageId?: string;
  vehicleEnginePackageIds?: string[];
  vehicleEngineOther?: boolean;
  vehicleEngineOtherExcludedPackageIds?: string[];
  vehicleEngineOtherExcludedModelTerms?: string[];
  /** Sayfalama isteğinde URL'yi yeniden kurmak için */
  vehicleBrandModelId?: string;
  bodyStyleId?: string;
  engineId?: string;
};
