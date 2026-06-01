import { NextResponse } from "next/server";
import { tryGetSupabaseEnv } from "@/lib/env";
import {
  fetchHomeListingsFeed,
  HOME_LISTINGS_PAGE_SIZE,
  type HomeListingsFeedFilters,
} from "@/lib/home-listings-feed";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function parseNum(s: string | null): number | undefined {
  if (s == null || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function filtersFromSearchParams(
  sp: URLSearchParams
): HomeListingsFeedFilters {
  const q = sp.get("q")?.trim();
  const vehicleModel = sp.get("vehicle_model")?.trim();
  return {
    categoryId: sp.get("category_id")?.trim() || undefined,
    cityId: sp.get("city_id")?.trim() || undefined,
    vehicleBrandId: sp.get("vehicle_brand_id")?.trim() || undefined,
    minPrice: parseNum(sp.get("min_price")),
    maxPrice: parseNum(sp.get("max_price")),
    minYear: parseNum(sp.get("min_year")),
    maxYear: parseNum(sp.get("max_year")),
    q: q || undefined,
    vehicleModel: vehicleModel || undefined,
  };
}

export async function GET(req: Request) {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return NextResponse.json({ error: "missing_env" }, { status: 503 });
  }

  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, parseNum(sp.get("page")) ?? 1);
  const pageSize = Math.min(
    60,
    Math.max(1, parseNum(sp.get("page_size")) ?? HOME_LISTINGS_PAGE_SIZE)
  );

  try {
    const supabase = await createSupabaseServerClient();
    const { items, total, loggedIn } = await fetchHomeListingsFeed(
      supabase,
      env,
      page,
      pageSize,
      filtersFromSearchParams(sp)
    );

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      loggedIn,
      hasMore: page * pageSize < total,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "feed_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
