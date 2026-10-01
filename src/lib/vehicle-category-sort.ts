/** Uygulama ile aynı kategori sırası (ilan ver). */
export const PRIMARY_VEHICLE_CATEGORY_ORDER = [
  "otomobil",
  "suv_pickup",
  "motosiklet",
  "elektrikli",
  "panelvan",
  "is_ve_tarim_makinesi",
  "scooter_bisiklet",
] as const;

export const SECONDARY_VEHICLE_CATEGORY_ORDER = [
  "klasik",
  "deniz",
  "hasarli",
  "karavan",
  "hava",
  "atv_utv",
] as const;

export function createListingCategorySortIndex(code: string): number {
  const c = code.trim().toLowerCase();
  const primary = PRIMARY_VEHICLE_CATEGORY_ORDER.indexOf(
    c as (typeof PRIMARY_VEHICLE_CATEGORY_ORDER)[number]
  );
  if (primary >= 0) return primary;
  const secondary = SECONDARY_VEHICLE_CATEGORY_ORDER.indexOf(
    c as (typeof SECONDARY_VEHICLE_CATEGORY_ORDER)[number]
  );
  if (secondary >= 0) return PRIMARY_VEHICLE_CATEGORY_ORDER.length + secondary;
  return 1000;
}

export function sortByCreateListingCategoryOrder<T>(
  items: T[],
  codeOf: (item: T) => string
): T[] {
  return [...items].sort((a, b) => {
    const ia = createListingCategorySortIndex(codeOf(a));
    const ib = createListingCategorySortIndex(codeOf(b));
    if (ia !== ib) return ia - ib;
    return codeOf(a).localeCompare(codeOf(b), "tr");
  });
}
