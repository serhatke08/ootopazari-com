import type { SupabaseClient } from "@supabase/supabase-js";
import {
  priceRatingIndicatorColor,
  type PriceRatingCounts,
} from "@/lib/listing-price-ratings";

export type PriceHistoryEntry = {
  id: string;
  price: number;
  recordedAt: string;
  ratingAverage: number | null;
  ratingCount: number;
  counts: PriceRatingCounts;
  indicatorColor: string;
};

export function formatListingPriceTry(price: number | null | undefined): string {
  if (price == null || !Number.isFinite(Number(price))) return "Fiyat sorunuz";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(Number(price));
}

export function formatPriceHistoryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function fetchListingPriceHistory(
  supabase: SupabaseClient,
  listingId: string
): Promise<PriceHistoryEntry[]> {
  const { data, error } = await supabase
    .from("listing_price_history")
    .select(
      "id,price,recorded_at,rating_average,rating_count,rating_fair_count,rating_expensive_count,rating_exorbitant_count"
    )
    .eq("listing_id", listingId)
    .order("recorded_at", { ascending: false });

  if (error) {
    if (error.code === "PGRST205") return [];
    console.warn("listing_price_history fetch:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as {
      id: string;
      price: number;
      recorded_at: string;
      rating_average: number | null;
      rating_count: number;
      rating_fair_count: number;
      rating_expensive_count: number;
      rating_exorbitant_count: number;
    };
    const counts: PriceRatingCounts = {
      fair: Number(r.rating_fair_count ?? 0),
      expensive: Number(r.rating_expensive_count ?? 0),
      exorbitant: Number(r.rating_exorbitant_count ?? 0),
    };
    const ratingCount = Number(r.rating_count ?? 0);
    const ratingAverage =
      r.rating_average != null ? Number(r.rating_average) : null;

    return {
      id: r.id,
      price: Number(r.price),
      recordedAt: r.recorded_at,
      ratingAverage,
      ratingCount,
      counts,
      indicatorColor: priceRatingIndicatorColor(ratingAverage, ratingCount),
    };
  });
}
