import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import { HomeQuickLinksStrip } from "@/components/HomeQuickLinksStrip";
import {
  buildCategoryMap,
  buildCityMap,
  buildBrandMap,
  type CategoryRow,
  type CityRow,
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
      <>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(seoJsonLd) }}
        />
        <HomeHero
          categories={categories}
          cities={cities}
          selectedCategoryId={categoryId}
          selectedCityId={cityId}
          q={q}
        />
        <HomeQuickLinksStrip />
        <div
          id="ilanlar"
          className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6"
        >
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
                    const ownerId = listing.user_id
                      ? String(listing.user_id)
                      : null;
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
      </>
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
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(seoJsonLd) }}
      />
      <HomeHero
        categories={categories}
        cities={cities}
        selectedCategoryId={categoryId}
        selectedCityId={cityId}
        q={q}
      />
      <HomeQuickLinksStrip />
      <div
        id="ilanlar"
        className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6"
      >
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
              <p className="text-sm text-zinc-500">
                Bu filtrelere uygun ilan yok.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4 xl:grid-cols-5">
                {rows.map((listing) => {
                  const cid = listing.category_id ?? undefined;
                  const categoryName = cid ? catMap.get(cid)?.name : null;
                  const sid = listing.id ? statsMap.get(listing.id) : undefined;
                  const ownerId = listing.user_id
                    ? String(listing.user_id)
                    : null;
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
    </>
  );
}

function HomeHero({
  categories,
  cities,
  selectedCategoryId,
  selectedCityId,
  q,
}: {
  categories: CategoryRow[];
  cities: CityRow[];
  selectedCategoryId?: string | null;
  selectedCityId?: string | null;
  q?: string;
}) {
  const categoryValue = selectedCategoryId ?? "";
  const cityValue = selectedCityId ?? "";
  const qValue = q ?? "";

  return (
    <section className="relative isolate overflow-hidden bg-[#05090c] text-white md:bg-[url('/hero/hero-bg.png')] md:bg-cover md:bg-right md:bg-no-repeat">
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,196,0,0.16),transparent_55%)]" />

      <div className="relative mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-6 sm:py-14">
        <div className="grid items-start gap-10 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-6 lg:col-span-5">
            <div className="max-w-[40rem]">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/90">
                Yeni nesil araç pazarı
                <span className="h-1 w-1 rounded-full bg-[#ffc400]" />
                İkinci el · Sıfır · Kiralık
              </p>

              <h1 className="mt-5 text-3xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl">
                Aracını <span className="text-[#ffc400]">bul</span>, güvenle{" "}
                <span className="text-[#ffc400]">sat</span>.
              </h1>

              <p className="mt-4 text-sm leading-relaxed text-white/80 sm:text-base">
                Kategori, şehir ve anahtar kelimeyle ilanları filtrele; favorile
                ve satıcıyla hızlıca iletişime geç.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href="#ilanlar"
                  className="inline-flex items-center justify-center rounded-md bg-[#ffc400] px-4 py-2.5 text-sm font-extrabold text-black hover:bg-[#ffd24d]"
                >
                  İlanları Keşfet
                </a>
                <Link
                  href="/ilan-ver"
                  className="inline-flex items-center justify-center rounded-md border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10"
                >
                  İlan Ver
                </Link>
              </div>
            </div>

            <div className="mt-8 max-w-[40rem]">
              <form
                action="/"
                method="get"
                className="rounded-2xl border border-white/15 bg-black/35 p-4 shadow-2xl backdrop-blur-md sm:p-5"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label
                      htmlFor="home-hero-category"
                      className="block text-[11px] font-semibold text-white/70"
                    >
                      Kategori
                    </label>
                    <select
                      id="home-hero-category"
                      name="category_id"
                      defaultValue={categoryValue}
                      className="mt-1 h-11 w-full rounded-lg border border-white/15 bg-black/50 px-3 text-sm text-white shadow-sm focus:border-[#ffc400]/60 focus:outline-none focus:ring-2 focus:ring-[#ffc400]/25"
                    >
                      <option value="">Tüm Kategoriler</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name ?? "Kategori"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor="home-hero-city"
                      className="block text-[11px] font-semibold text-white/70"
                    >
                      Şehir
                    </label>
                    <select
                      id="home-hero-city"
                      name="city_id"
                      defaultValue={cityValue}
                      className="mt-1 h-11 w-full rounded-lg border border-white/15 bg-black/50 px-3 text-sm text-white shadow-sm focus:border-[#ffc400]/60 focus:outline-none focus:ring-2 focus:ring-[#ffc400]/25"
                    >
                      <option value="">Tüm Şehirler</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name ?? "Şehir"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <label
                        htmlFor="home-hero-q"
                        className="block text-[11px] font-semibold text-white/70"
                      >
                        Arama
                      </label>
                      <input
                        id="home-hero-q"
                        type="search"
                        name="q"
                        defaultValue={qValue}
                        placeholder="Marka, model, ilan no…"
                        autoComplete="off"
                        enterKeyHint="search"
                        className="mt-1 h-11 w-full rounded-lg border border-white/15 bg-black/50 px-3 text-sm text-white shadow-sm placeholder:text-white/55 focus:border-[#ffc400]/60 focus:outline-none focus:ring-2 focus:ring-[#ffc400]/25"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="h-11 w-full rounded-lg bg-[#ffc400] px-4 text-sm font-extrabold text-black hover:bg-[#ffd24d] sm:w-auto"
                      >
                        Ara
                      </button>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-xs text-white/60">
                  İlan numarasıyla direkt arama:{" "}
                  <span className="font-semibold">12345</span>
                </p>
              </form>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <HeroFeature title="Doğrulanmış" sub="İlanlar" />
                <HeroFeature title="Hızlı" sub="Mesajlaşma" />
                <HeroFeature title="Kolay" sub="Favorile" />
                <HeroFeature title="7/24" sub="Destek" />
              </div>
            </div>
          </div>
          <div className="hidden md:block md:col-span-6 lg:col-span-7" aria-hidden />
        </div>
      </div>
    </section>
  );
}

function HeroFeature({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md">
      <p className="text-sm font-extrabold text-white">{title}</p>
      <p className="text-sm font-semibold text-white/75">{sub}</p>
    </div>
  );
}
