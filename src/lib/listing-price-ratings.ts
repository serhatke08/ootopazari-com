import type { SupabaseClient } from "@supabase/supabase-js";

/** 1 = makul, 2 = biraz pahalı, 3 = fahiş */
export type PriceRatingValue = 1 | 2 | 3;

export type PriceRatingCounts = {
  fair: number;
  expensive: number;
  exorbitant: number;
};

export const PRICE_RATING_OPTIONS: Array<{
  value: PriceRatingValue;
  label: string;
  shortLabel: string;
  color: string;
  countKey: keyof PriceRatingCounts;
}> = [
  {
    value: 1,
    label: "Makul fiyat",
    shortLabel: "Makul",
    color: "#16a34a",
    countKey: "fair",
  },
  {
    value: 2,
    label: "Biraz pahalı",
    shortLabel: "Biraz pahalı",
    color: "#ca8a04",
    countKey: "expensive",
  },
  {
    value: 3,
    label: "Fahiş fiyat",
    shortLabel: "Fahiş",
    color: "#dc2626",
    countKey: "exorbitant",
  },
];

export type PriceRatingSummary = {
  average: number | null;
  count: number;
  userRating: PriceRatingValue | null;
  counts: PriceRatingCounts;
};

const EMPTY_COUNTS: PriceRatingCounts = {
  fair: 0,
  expensive: 0,
  exorbitant: 0,
};

export const EMPTY_PRICE_RATING_SUMMARY: PriceRatingSummary = {
  average: null,
  count: 0,
  userRating: null,
  counts: EMPTY_COUNTS,
};

export function isPriceRatingValue(v: unknown): v is PriceRatingValue {
  return v === 1 || v === 2 || v === 3;
}

export function priceRatingIndicatorColor(
  average: number | null,
  count: number
): string {
  if (count <= 0 || average == null) return "#9ca3af";
  if (average < 2) return "#16a34a";
  if (average < 2.5) return "#ca8a04";
  if (average < 3) return "#ea580c";
  return "#dc2626";
}

function countKeyForRating(rating: number): keyof PriceRatingCounts | null {
  if (rating === 1) return "fair";
  if (rating === 2) return "expensive";
  if (rating === 3) return "exorbitant";
  return null;
}

function buildSummary(
  rows: Array<{ listing_id: string; rating: number; user_id: string }>,
  listingId: string,
  userId?: string | null
): PriceRatingSummary {
  const mine = rows.filter((r) => r.listing_id === listingId);
  const counts: PriceRatingCounts = { fair: 0, expensive: 0, exorbitant: 0 };

  for (const row of mine) {
    const key = countKeyForRating(Number(row.rating));
    if (key) counts[key] += 1;
  }

  if (mine.length === 0) {
    return { ...EMPTY_PRICE_RATING_SUMMARY, userRating: null };
  }

  const sum = mine.reduce((a, r) => a + Number(r.rating), 0);
  const userRow = userId ? mine.find((r) => r.user_id === userId) : undefined;

  return {
    average: sum / mine.length,
    count: mine.length,
    counts,
    userRating:
      userRow && isPriceRatingValue(userRow.rating) ? userRow.rating : null,
  };
}

export async function fetchPriceRatingSummary(
  supabase: SupabaseClient,
  listingId: string,
  userId?: string | null
): Promise<PriceRatingSummary> {
  const map = await fetchPriceRatingSummariesMap(
    supabase,
    [listingId],
    userId
  );
  return map.get(listingId) ?? EMPTY_PRICE_RATING_SUMMARY;
}

export async function fetchPriceRatingSummariesMap(
  supabase: SupabaseClient,
  listingIds: string[],
  userId?: string | null
): Promise<Map<string, PriceRatingSummary>> {
  const map = new Map<string, PriceRatingSummary>();
  const ids = [...new Set(listingIds.filter(Boolean))];
  if (ids.length === 0) return map;

  const { data, error } = await supabase
    .from("listing_price_ratings")
    .select("listing_id,rating,user_id")
    .in("listing_id", ids);

  if (error) {
    console.warn("listing_price_ratings fetch:", error.message);
    for (const id of ids) map.set(id, EMPTY_PRICE_RATING_SUMMARY);
    return map;
  }

  const rows = (data ?? []) as Array<{
    listing_id: string;
    rating: number;
    user_id: string;
  }>;

  for (const id of ids) {
    map.set(id, buildSummary(rows, id, userId));
  }
  return map;
}

export function summaryAfterVote(
  prev: PriceRatingSummary,
  rating: PriceRatingValue
): PriceRatingSummary {
  const counts = { ...prev.counts };
  let count = prev.count;
  let sum = (prev.average ?? 0) * prev.count;

  if (prev.userRating != null) {
    const oldKey = countKeyForRating(prev.userRating);
    if (oldKey) counts[oldKey] = Math.max(0, counts[oldKey] - 1);
    sum = sum - prev.userRating + rating;
  } else {
    count += 1;
    sum += rating;
  }

  const newKey = countKeyForRating(rating);
  if (newKey) counts[newKey] += 1;

  return {
    count,
    average: count > 0 ? sum / count : null,
    userRating: rating,
    counts,
  };
}
