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
    color: "#22C55E",
    countKey: "fair",
  },
  {
    value: 2,
    label: "Biraz pahalı",
    shortLabel: "Biraz pahalı",
    color: "#EAB308",
    countKey: "expensive",
  },
  {
    value: 3,
    label: "Fahiş fiyat",
    shortLabel: "Fahiş",
    color: "#EF4444",
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

/** Nokta — oy yokken soluk gri. Mobil `indicatorColor` ile aynı. */
export function priceRatingIndicatorColor(
  average: number | null,
  count: number
): string {
  if (count <= 0 || average == null) return "#BDBDBD";
  if (average < 1.8) return "#22C55E";
  if (average < 2.2) return "#EAB308";
  if (average < 2.6) return "#F97316";
  return "#EF4444";
}

/** Fiyat yazısı — oy yokken koyu gri. Mobil `priceDisplayColor` ile aynı. */
export function priceRatingDisplayColor(
  average: number | null,
  count: number
): string {
  if (count <= 0 || average == null) return "#18181B";
  return priceRatingIndicatorColor(average, count);
}

/** Anket rengine göre yarı saydam arka plan. */
export function priceRatingFill(hex: string, alpha = 0.16): string {
  const raw = hex.replace("#", "").trim();
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (full.length !== 6 || !/^[0-9a-f]+$/i.test(full)) {
    return `rgba(156, 163, 175, ${alpha})`;
  }
  const n = Number.parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

  const rpcOk = await fillSummariesFromRpc(supabase, ids, map);
  if (!rpcOk) {
    await fillSummariesFromTable(supabase, ids, userId, map);
  }

  if (userId) {
    await attachUserRatings(supabase, ids, userId, map);
  }

  for (const id of ids) {
    if (!map.has(id)) map.set(id, EMPTY_PRICE_RATING_SUMMARY);
  }
  return map;
}

async function fillSummariesFromRpc(
  supabase: SupabaseClient,
  ids: string[],
  map: Map<string, PriceRatingSummary>
): Promise<boolean> {
  const { data, error } = await supabase.rpc("get_listing_price_rating_stats", {
    listing_ids: ids,
  });
  if (error) {
    console.warn("get_listing_price_rating_stats:", error.message);
    return false;
  }
  const rows = (data ?? []) as Array<{
    listing_id?: string;
    rating_count?: number | string | null;
    rating_avg?: number | string | null;
    fair_count?: number | string | null;
    high_count?: number | string | null;
    unfair_count?: number | string | null;
  }>;
  for (const row of rows) {
    const id = String(row.listing_id ?? "").trim();
    if (!id) continue;
    const count = Number(row.rating_count ?? 0);
    if (!Number.isFinite(count) || count <= 0) continue;
    const avg = Number(row.rating_avg);
    map.set(id, {
      count,
      average: Number.isFinite(avg) ? avg : null,
      userRating: null,
      counts: {
        fair: Number(row.fair_count ?? 0) || 0,
        expensive: Number(row.high_count ?? 0) || 0,
        exorbitant: Number(row.unfair_count ?? 0) || 0,
      },
    });
  }
  return true;
}

async function fillSummariesFromTable(
  supabase: SupabaseClient,
  ids: string[],
  userId: string | null | undefined,
  map: Map<string, PriceRatingSummary>
) {
  const { data, error } = await supabase
    .from("listing_price_ratings")
    .select("listing_id,rating,user_id")
    .in("listing_id", ids);
  if (error) {
    console.warn("listing_price_ratings fetch:", error.message);
    return;
  }
  const rows = (data ?? []) as Array<{
    listing_id: string;
    rating: number;
    user_id: string;
  }>;
  for (const id of ids) {
    map.set(id, buildSummary(rows, id, userId));
  }
}

async function attachUserRatings(
  supabase: SupabaseClient,
  ids: string[],
  userId: string,
  map: Map<string, PriceRatingSummary>
) {
  const { data, error } = await supabase
    .from("listing_price_ratings")
    .select("listing_id,rating")
    .eq("user_id", userId)
    .in("listing_id", ids);
  if (error) return;
  for (const row of data ?? []) {
    const id = String(
      (row as { listing_id?: string }).listing_id ?? ""
    ).trim();
    const rating = (row as { rating?: number }).rating;
    if (!id || !isPriceRatingValue(rating)) continue;
    const prev = map.get(id) ?? EMPTY_PRICE_RATING_SUMMARY;
    map.set(id, { ...prev, userRating: rating });
  }
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
