import type {
  HomeListingCardItem,
  HomeListingsFeedFilters,
} from "@/lib/home-listings-feed-types";
import type { ListingRow } from "@/lib/listings-data";

export const HOME_FILTER_FUELS = [
  "Benzin",
  "Dizel",
  "Elektrik",
  "Hibrit",
  "LPG + Benzin",
] as const;

export const HOME_FILTER_TRANSMISSIONS = [
  "Manuel",
  "Otomatik",
  "Yarı Otomatik",
] as const;

const HIDDEN_CATEGORY_CODES = new Set([
  "all",
  "dog",
  "cat",
  "bird",
  "fish",
  "pet",
  "hayvan",
  "animals",
  "kedi",
  "kopek",
  "köpek",
  "kus",
  "kuş",
  "balik",
  "balık",
]);

function norm(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLocaleLowerCase("tr");
}

export function isHiddenFilterCategory(code: string | null | undefined, name?: string | null): boolean {
  const c = norm(code);
  const n = norm(name);
  if (!c && !n) return false;
  if (HIDDEN_CATEGORY_CODES.has(c) || HIDDEN_CATEGORY_CODES.has(n)) return true;
  if (n.includes("hayvan") || c.includes("hayvan")) return true;
  return false;
}

export function isHiddenFilterBrand(code: string | null | undefined, name?: string | null): boolean {
  return norm(code) === "hummer" || norm(name) === "hummer";
}

export function countHomeFilterBadges(filters: HomeListingsFeedFilters): number {
  let n = 0;
  if (filters.categoryId) n += 1;
  if ((filters.vehicleBrandIds?.length ?? 0) > 0 || filters.vehicleBrandId) n += 1;
  if ((filters.vehicleModels?.length ?? 0) > 0 || filters.vehicleModel) n += 1;
  if (filters.minPrice != null || filters.maxPrice != null) n += 1;
  if (filters.minYear != null || filters.maxYear != null) n += 1;
  if (filters.minKm != null || filters.maxKm != null) n += 1;
  if (filters.fuelType) n += 1;
  if (filters.transmissionType) n += 1;
  if (filters.hasPhoto) n += 1;
  if (filters.vehiclesOnly) n += 1;
  return n;
}

function fuelMatches(listingFuel: unknown, selected: string): boolean {
  const a = norm(listingFuel);
  const b = norm(selected);
  if (!b) return true;
  if (!a) return false;
  if (b.includes("lpg")) return a.includes("lpg");
  return a === b || a.includes(b) || b.includes(a);
}

function listingLooksLikeVehicle(listing: ListingRow): boolean {
  return Boolean(
    listing.vehicle_year != null ||
      listing.vehicle_brand_id ||
      String(listing.vehicle_model ?? "").trim() ||
      String(listing.fuel_type ?? "").trim() ||
      String(listing.transmission_type ?? "").trim()
  );
}

export function listingPassesHomeClientFilters(
  listing: ListingRow,
  filters: HomeListingsFeedFilters
): boolean {
  if (filters.categoryId && String(listing.category_id ?? "") !== filters.categoryId) {
    return false;
  }
  const brandIds = [
    ...new Set(
      [...(filters.vehicleBrandIds ?? []), filters.vehicleBrandId ?? ""].filter(Boolean)
    ),
  ];
  if (
    brandIds.length > 0 &&
    !brandIds.includes(String(listing.vehicle_brand_id ?? ""))
  ) {
    return false;
  }
  const models = [
    ...new Set(
      [...(filters.vehicleModels ?? []), filters.vehicleModel ?? ""]
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
  if (models.length > 0) {
    const key = norm(listing.vehicle_model);
    if (!models.some((m) => key.includes(norm(m)))) return false;
  }
  if (filters.minPrice != null && Number(listing.price ?? NaN) < filters.minPrice) {
    return false;
  }
  if (filters.maxPrice != null && Number(listing.price ?? NaN) > filters.maxPrice) {
    return false;
  }
  const year = listing.vehicle_year != null ? Number(listing.vehicle_year) : NaN;
  if (filters.minYear != null && !(Number.isFinite(year) && year >= filters.minYear)) {
    return false;
  }
  if (filters.maxYear != null && !(Number.isFinite(year) && year <= filters.maxYear)) {
    return false;
  }
  const km =
    listing.vehicle_mileage != null
      ? Number(String(listing.vehicle_mileage).replace(/\D/g, ""))
      : NaN;
  if (filters.minKm != null && !(Number.isFinite(km) && km >= filters.minKm)) {
    return false;
  }
  if (filters.maxKm != null && !(Number.isFinite(km) && km <= filters.maxKm)) {
    return false;
  }
  if (filters.fuelType && !fuelMatches(listing.fuel_type, filters.fuelType)) {
    return false;
  }
  if (filters.transmissionType) {
    if (norm(listing.transmission_type) !== norm(filters.transmissionType)) {
      return false;
    }
  }
  if (filters.hasPhoto) {
    const img = String(listing.image_url ?? "").trim();
    if (!img) return false;
  }
  if (filters.vehiclesOnly && !listingLooksLikeVehicle(listing)) {
    return false;
  }
  return true;
}

export function filterHomeListingItems(
  items: HomeListingCardItem[],
  filters: HomeListingsFeedFilters
): HomeListingCardItem[] {
  return items.filter((item) =>
    listingPassesHomeClientFilters(item.listing, filters)
  );
}

export function homeFilterRangeError(
  min: number | undefined,
  max: number | undefined,
  label: string
): string | null {
  if (min != null && max != null && min > max) {
    return `${label}: minimum, maksimumdan büyük olamaz.`;
  }
  return null;
}

function fmtTr(n: number): string {
  return n.toLocaleString("tr-TR");
}

export function formatHomeFilterRangeChip(
  min: number | undefined,
  max: number | undefined,
  suffix = ""
): string {
  const s = suffix ? ` ${suffix}` : "";
  if (min != null && max != null) return `${fmtTr(min)} – ${fmtTr(max)}${s}`;
  if (min != null) return `${fmtTr(min)}+${s}`;
  if (max != null) return `≤ ${fmtTr(max)}${s}`;
  return "";
}

/** Konum / arama / sıralama dışındaki sheet alanlarını siler. */
export function clearHomeSheetFilters(
  f: HomeListingsFeedFilters
): HomeListingsFeedFilters {
  return {
    cityId: f.cityId,
    cityIds: f.cityIds,
    sort: f.sort,
    q: f.q,
  };
}
