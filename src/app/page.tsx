import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import {
  buildCategoryMap,
  buildCityMap,
  buildBrandMap,
  fetchCategories,
  fetchCities,
  resolveListingCityDisplay,
  fetchListingsPage,
  fetchRecentListings,
  fetchVehicleBrands,
} from "@/lib/listings-data";
import { fetchListingPublicStatsMap } from "@/lib/listing-stats";
import { getSessionAndFavoriteSet } from "@/lib/favorites";
import { ListingCard } from "@/components/ListingCard";
import { HomeSidebar } from "@/components/HomeSidebar";
import { TopCitySelect } from "@/components/TopCitySelect";
import { listingNumberFromSearchQuery } from "@/lib/listing-number-search";
import { sanitizeUserAvatarUrl } from "@/lib/oauth-avatar";
import { getSiteOrigin } from "@/lib/site-url";
import { publicAvatarUrl } from "@/lib/storage";

const LIST_LIMIT = 24;
const PAGE_SIZE = 12;

export const metadata: Metadata = {
  title: "İkinci El ve Sıfır Araç İlanları",
  description:
    "Oto Pazarı'nda otomobil ilanlarını marka, model, şehir ve fiyat filtreleriyle keşfedin.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Oto Pazarı | İkinci El ve Sıfır Araç İlanları",
    description:
      "Marka, model, şehir ve fiyat filtreleriyle araç ilanlarını keşfedin.",
    url: "/",
    type: "website",
  },
};

function parseNum(s: string | undefined): number | undefined {
  if (s == null || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function buildQuery(base: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  Object.entries(base).forEach(([k, v]) => {
    if (v != null && v !== "") p.set(k, v);
  });
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

type OwnerMini = {
  name: string;
  avatarSrc: string | null;
  href: string;
};

async function fetchOwnerMiniMap(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  env: NonNullable<ReturnType<typeof tryGetSupabaseEnv>>,
  userIds: (string | undefined | null)[]
): Promise<Map<string, OwnerMini>> {
  const ids = [...new Set(userIds.filter(Boolean).map((x) => String(x)))];
  const map = new Map<string, OwnerMini>();
  if (ids.length === 0) return map;

  const { data } = await supabase
    .from("profiles")
    .select("id,full_name,username,avatar_url")
    .in("id", ids);

  for (const row of data ?? []) {
    const id = String((row as { id?: string }).id ?? "");
    if (!id) continue;
    const full = String((row as { full_name?: string }).full_name ?? "").trim();
    const un = String((row as { username?: string }).username ?? "").trim();
    const name = full || un || "Kullanıcı";
    const raw =
      sanitizeUserAvatarUrl(
        String((row as { avatar_url?: string }).avatar_url ?? "").trim()
      ) ?? "";
    const avatarSrc = raw
      ? /^https?:\/\//i.test(raw)
        ? raw
        : publicAvatarUrl(env, raw.replace(/^\/+/, ""))
      : null;
    map.set(id, { name, avatarSrc, href: `/kullanici/${id}` });
  }
  return map;
}

export default async function AnaSayfa({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const siteOrigin = getSiteOrigin();
  const seoJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Oto Pazarı",
        url: siteOrigin,
        logo: `${siteOrigin}/menu/pazar.png?v=20260413`,
      },
      {
        "@type": "WebSite",
        name: "Oto Pazarı",
        url: siteOrigin,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteOrigin}/?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-12 sm:px-6">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(seoJsonLd) }}
        />
        <MissingEnv />
      </div>
    );
  }

  const sp = await searchParams;
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const page = Math.max(1, parseNum(get("page")) ?? 1);
  const categoryId = get("category_id");
  const cityId = get("city_id");
  const vehicleBrandId = get("vehicle_brand_id");
  const minPrice = parseNum(get("min_price"));
  const maxPrice = parseNum(get("max_price"));
  const minYear = parseNum(get("min_year"));
  const maxYear = parseNum(get("max_year"));
  const q = get("q")?.trim() ?? "";
  const vehicleModel = get("vehicle_model")?.trim() ?? "";
  const vehicleBrandModelId = get("vehicle_brand_model_id")?.trim() ?? "";

  const directListingNo = listingNumberFromSearchQuery(q);
  if (directListingNo) {
    redirect(`/ilan/${directListingNo}`);
  }

  const hasListFilters = !!(
    categoryId ||
    cityId ||
    vehicleBrandId ||
    vehicleBrandModelId ||
    minPrice != null ||
    maxPrice != null ||
    minYear != null ||
    maxYear != null ||
    q ||
    vehicleModel
  );

  const supabase = await createSupabaseServerClient();
  const [categories, cities] = await Promise.all([
    fetchCategories(supabase),
    fetchCities(supabase),
  ]);
  const catMap = buildCategoryMap(categories);
  const cityMap = buildCityMap(cities);

  if (!hasListFilters) {
    const recent = await fetchRecentListings(supabase, LIST_LIMIT);
    const ids = recent.map((r) => r.id).filter(Boolean) as string[];
    const [statsMap, sessionFav, owners] = await Promise.all([
      fetchListingPublicStatsMap(supabase, ids),
      getSessionAndFavoriteSet(supabase, ids),
      fetchOwnerMiniMap(
        supabase,
        env,
        recent.map((r) => r.user_id ?? null)
      ),
    ]);
    const loggedIn = !!sessionFav.user;

    return (
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(seoJsonLd) }}
        />
        <TopCitySelect cities={cities} />
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-5">
          <aside className="hidden w-full shrink-0 lg:flex lg:h-[calc(100vh-5.5rem)] lg:min-h-0 lg:w-[min(240px,20vw)] lg:min-w-[200px] lg:max-w-[260px] lg:max-h-[calc(100vh-5.5rem)] lg:flex-col lg:overflow-hidden lg:self-start">
            <HomeSidebar categories={categories} />
          </aside>

          <div className="min-w-0 flex-1 space-y-6">
            {recent.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Henüz ilan yok veya RLS engelliyor.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4 xl:grid-cols-5">
                {recent.map((listing) => {
                  const cid = listing.category_id ?? undefined;
                  const categoryName = cid ? catMap.get(cid)?.name : null;
                  const sid = listing.id ? statsMap.get(listing.id) : undefined;
                  const ownerId = listing.user_id ? String(listing.user_id) : null;
                  const owner = ownerId ? owners.get(ownerId) : undefined;
                  return (
                    <ListingCard
                      key={listing.id ?? String(listing.listing_number)}
                      listing={listing}
                      env={env}
                      categoryName={categoryName}
                      hideCategoryAndYear
                      cityOnStatsRow
                      cityDisplayName={resolveListingCityDisplay(
                        listing,
                        cityMap
                      )}
                      stats={sid}
                      loggedIn={loggedIn}
                      favorited={
                        listing.id
                          ? sessionFav.favoriteIds.has(listing.id)
                          : false
                      }
                      ownerName={owner?.name ?? null}
                      ownerAvatarSrc={owner?.avatarSrc ?? null}
                      ownerHref={owner?.href ?? null}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const brands = await fetchVehicleBrands(supabase, categoryId ?? null);
  const brandMap = buildBrandMap(brands);

  const { rows, total } = await fetchListingsPage(supabase, {
    page,
    pageSize: PAGE_SIZE,
    categoryId: categoryId || undefined,
    cityId: cityId || undefined,
    vehicleBrandId: vehicleBrandId || undefined,
    minPrice,
    maxPrice,
    minYear,
    maxYear,
    q: q || undefined,
    vehicleModel: vehicleModel || undefined,
  });

  const ids = rows.map((r) => r.id).filter(Boolean) as string[];
  const [statsMap, sessionFav, owners] = await Promise.all([
    fetchListingPublicStatsMap(supabase, ids),
    getSessionAndFavoriteSet(supabase, ids),
    fetchOwnerMiniMap(
      supabase,
      env,
      rows.map((r) => r.user_id ?? null)
    ),
  ]);
  const loggedIn = !!sessionFav.user;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const baseParams: Record<string, string | undefined> = {
    category_id: categoryId,
    city_id: cityId,
    vehicle_brand_id: vehicleBrandId,
    vehicle_brand_model_id: vehicleBrandModelId || undefined,
    min_price: get("min_price"),
    max_price: get("max_price"),
    min_year: get("min_year"),
    max_year: get("max_year"),
    q: q || undefined,
    vehicle_model: vehicleModel || undefined,
  };
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(seoJsonLd) }}
      />
      <TopCitySelect cities={cities} />
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-5">
        <aside className="hidden w-full shrink-0 lg:flex lg:h-[calc(100vh-5.5rem)] lg:min-h-0 lg:w-[min(240px,20vw)] lg:min-w-[200px] lg:max-w-[260px] lg:max-h-[calc(100vh-5.5rem)] lg:flex-col lg:overflow-hidden lg:self-start">
          <HomeSidebar categories={categories} />
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          <p className="text-sm text-zinc-600">
            {total} sonuç · sayfa {page} / {totalPages}
            {categoryId && catMap.get(categoryId)?.name
              ? ` · ${catMap.get(categoryId)?.name}`
              : ""}
            {cityId && cityMap.get(cityId)?.name
              ? ` · ${cityMap.get(cityId)?.name}`
              : ""}
            {vehicleBrandId && brandMap.get(vehicleBrandId)?.name
              ? ` · ${brandMap.get(vehicleBrandId)?.name}`
              : ""}
            {vehicleBrandModelId && vehicleModel
              ? ` · seri: ${vehicleModel}`
              : vehicleBrandModelId
                ? " · seri filtresi"
                : vehicleModel
                  ? ` · model: ${vehicleModel}`
                  : ""}
            {q ? ` · “${q}”` : ""}
          </p>

          {rows.length === 0 ? (
            <p className="text-sm text-zinc-500">Bu filtrelere uygun ilan yok.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4 xl:grid-cols-5">
              {rows.map((listing) => {
                const cid = listing.category_id ?? undefined;
                const categoryName = cid ? catMap.get(cid)?.name : null;
                const sid = listing.id ? statsMap.get(listing.id) : undefined;
                const ownerId = listing.user_id ? String(listing.user_id) : null;
                const owner = ownerId ? owners.get(ownerId) : undefined;
                return (
                  <ListingCard
                    key={listing.id ?? String(listing.listing_number)}
                    listing={listing}
                    env={env}
                    categoryName={categoryName}
                    hideCategoryAndYear
                    cityOnStatsRow
                    cityDisplayName={resolveListingCityDisplay(
                      listing,
                      cityMap
                    )}
                    stats={sid}
                    loggedIn={loggedIn}
                    favorited={
                      listing.id ? sessionFav.favoriteIds.has(listing.id) : false
                    }
                    ownerName={owner?.name ?? null}
                    ownerAvatarSrc={owner?.avatarSrc ?? null}
                    ownerHref={owner?.href ?? null}
                  />
                );
              })}
            </div>
          )}

          <nav className="flex flex-wrap items-center justify-between gap-4 text-sm">
            {prevPage != null ? (
              <Link
                href={`/${buildQuery({ ...baseParams, page: String(prevPage) })}`}
                className="rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-50"
              >
                ← Önceki
              </Link>
            ) : (
              <span className="text-zinc-400">← Önceki</span>
            )}
            {nextPage != null ? (
              <Link
                href={`/${buildQuery({ ...baseParams, page: String(nextPage) })}`}
                className="rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-50"
              >
                Sonraki →
              </Link>
            ) : (
              <span className="text-zinc-400">Sonraki →</span>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
