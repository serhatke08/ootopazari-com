import type { SupabaseClient } from "@supabase/supabase-js";

/** 1 = makul, 2 = biraz pahalı, 3 = fahiş */
export type PriceRatingValue = 1 | 2 | 3;

export const PRICE_RATING_OPTIONS: Array<{
  value: PriceRatingValue;
  label: string;
  color: string;
}> = [
  { value: 1, label: "Makul fiyat", color: "#16a34a" },
  { value: 2, label: "Biraz pahalı", color: "#ca8a04" },
  { value: 3, label: "Fahiş fiyat", color: "#dc2626" },
];

export type PriceRatingSummary = {
  average: number | null;
  count: number;
  userRating: PriceRatingValue | null;
};

const EMPTY_SUMMARY: PriceRatingSummary = {
  average: null,
  count: 0,
  userRating: null,
};

export function isPriceRatingValue(v: unknown): v is PriceRatingValue {
  return v === 1 || v === 2 || v === 3;
}

/** Oy ortalamasına göre gösterge rengi (oy yoksa gri). */
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

function buildSummary(
  rows: Array<{ listing_id: string; rating: number; user_id: string }>,
  listingId: string,
  userId?: string | null
): PriceRatingSummary {
  const mine = rows.filter((r) => r.listing_id === listingId);
  if (mine.length === 0) {
    return userId ? { ...EMPTY_SUMMARY, userRating: null } : EMPTY_SUMMARY;
  }
  const sum = mine.reduce((a, r) => a + Number(r.rating), 0);
  const userRow = userId
    ? mine.find((r) => r.user_id === userId)
    : undefined;
  return {
    average: sum / mine.length,
    count: mine.length,
    userRating: userRow && isPriceRatingValue(userRow.rating)
      ? userRow.rating
      : null,
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
  return map.get(listingId) ?? EMPTY_SUMMARY;
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
    for (const id of ids) map.set(id, EMPTY_SUMMARY);
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
  const hadUserVote = prev.userRating != null;
  const oldUser = prev.userRating ?? 0;
  let count = prev.count;
  let sum = (prev.average ?? 0) * prev.count;

  if (hadUserVote) {
    sum = sum - oldUser + rating;
  } else {
    count += 1;
    sum += rating;
  }

  return {
    count,
    average: count > 0 ? sum / count : null,
    userRating: rating,
  };
}
