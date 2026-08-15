import type { ListingPublicStats } from "@/lib/listing-stats";
import type { PriceRatingSummary } from "@/lib/listing-price-ratings";
import type { ListingRow } from "@/lib/listings-data";

export const HOME_LISTINGS_PAGE_SIZE = 30;

export const HOME_LISTINGS_SORT_OPTIONS = [
  { value: "newest", label: "En yeni" },
  { value: "price_asc", label: "Fiyat (artan)" },
  { value: "price_desc", label: "Fiyat (azalan)" },
  { value: "km_asc", label: "KM (artan)" },
  { value: "km_desc", label: "KM (azalan)" },
  { value: "year_desc", label: "Yıl (yeni → eski)" },
  { value: "year_asc", label: "Yıl (eski → yeni)" },
] as const;

export type HomeListingsSort =
  (typeof HOME_LISTINGS_SORT_OPTIONS)[number]["value"];

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
  cityIds?: string[];
  sort?: HomeListingsSort;
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
