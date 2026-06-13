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
  fetchVehicleBrands,
} from "@/lib/listings-data";
import {
  fetchHomeListingsFeed,
  HOME_LISTINGS_PAGE_SIZE,
} from "@/lib/home-listings-feed";
import {
  homeListingsFeedHasFilters,
  resolveHomeListingsFeedFilters,
} from "@/lib/home-listings-feed-filters";
import { HomeListingsGrid } from "@/components/HomeListingsGrid";
import { HomeSidebar } from "@/components/HomeSidebar";
import { TopCitySelect } from "@/components/TopCitySelect";
import { ListingFilters } from "@/components/ListingFilters";
import { listingNumberFromSearchQuery } from "@/lib/listing-number-search";
import { buildHomeSeoJsonLd } from "@/lib/seo-json-ld";
import { getSiteOrigin } from "@/lib/site-url";
import { ADSENSE_HOME_SLOT } from "@/lib/adsense";
import { AdSenseUnit } from "@/components/AdSenseUnit";

/** Geçici: ana sayfa hero bölümü (kaldırılmadı, devre dışı). */
const SHOW_HOME_HERO = false;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const origin = getSiteOrigin();
  
  // Query parametreli sayfalar için canonical tag'i ana sayfaya yönlendir
  const hasQuery = sp.q || sp.category_id || sp.city_id || sp.vehicle_brand_id;
  
  return {
    title: {
      absolute: "Oto Pazarı — İkinci El ve Sıfır Araç İlanları",
    },
    description:
      "Oto Pazarı ile ikinci el araba, sıfır otomobil ve araç ilanlarını keşfedin. Türkiye genelinde ücretsiz ilan ver, filtrele ve mesajlaş.",
    alternates: {
      canonical: hasQuery ? origin : "/",
    },
    openGraph: {
      title: "Oto Pazarı — İkinci El ve Sıfır Araç İlanları",
      description:
        "Türkiye'nin oto pazarı — ikinci el araba ve sıfır otomobil ilanları.",
      url: "/",
      type: "website",
    },
  };
}

export default async function AnaSayfa({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const siteOrigin = getSiteOrigin();
  const seoJsonLd = buildHomeSeoJsonLd({ siteOrigin });

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

  const q = get("q")?.trim() ?? "";

  const directListingNo = listingNumberFromSearchQuery(q);
  if (directListingNo) {
    redirect(`/ilan/${directListingNo}`);
  }

  const supabase = await createSupabaseServerClient();
  const listFilters = await resolveHomeListingsFeedFilters(supabase, (k) =>
    get(k)
  );
  const hasListFilters = homeListingsFeedHasFilters(listFilters);

  const categoryId = listFilters.categoryId;
  const cityId = listFilters.cityId;
  const vehicleBrandId = listFilters.vehicleBrandId;

  const [categories, cities] = await Promise.all([
    fetchCategories(supabase),
    fetchCities(supabase),
  ]);
  const catMap = buildCategoryMap(categories);
  const cityMap = buildCityMap(cities);

  if (!hasListFilters) {
    const { items, total, loggedIn } = await fetchHomeListingsFeed(
      supabase,
      env,
      1,
      HOME_LISTINGS_PAGE_SIZE
    );

    const seoJsonLdWithListings = buildHomeSeoJsonLd({
      siteOrigin,
      listings: items.slice(0, 12).map((item) => ({
        listingNumber: String(item.listing.listing_number ?? ""),
        title: String(item.listing.title ?? "Araç ilanı"),
      })),
    });

    return (
      <>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(seoJsonLdWithListings),
          }}
        />
        {SHOW_HOME_HERO ? (
          <HomeHero
            categories={categories}
            cities={cities}
            selectedCategoryId={categoryId}
            selectedCityId={cityId}
            q={q}
          />
        ) : null}
        <HomeQuickLinksStrip />
        <div
          id="ilanlar"
          className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6"
        >
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-5">
            <aside className="hidden w-full shrink-0 lg:sticky lg:top-[5.5rem] lg:flex lg:h-[calc(100dvh-5.5rem)] lg:max-h-[calc(100dvh-5.5rem)] lg:min-h-0 lg:w-[min(280px,22vw)] lg:min-w-[240px] lg:max-w-[300px] lg:flex-col lg:overflow-hidden lg:self-start">
              <HomeSidebar categories={categories} />
            </aside>

            <div className="min-w-0 flex-1">
              <div className="mb-4 flex items-center justify-end gap-2">
                <TopCitySelect cities={cities} />
                <ListingFilters />
              </div>
              <AdSenseUnit
                slot={ADSENSE_HOME_SLOT}
                className="mb-4 hidden sm:block"
                label="Sponsorlu"
              />
              {items.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Henüz ilan yok veya RLS engelliyor.
                </p>
              ) : (
                <HomeListingsGrid
                  initialItems={items}
                  total={total}
                  env={env}
                  loggedIn={loggedIn}
                />
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  const brands = await fetchVehicleBrands(supabase, categoryId ?? null);
  const brandMap = buildBrandMap(brands);

  const { items, total, loggedIn } = await fetchHomeListingsFeed(
    supabase,
    env,
    1,
    HOME_LISTINGS_PAGE_SIZE,
    listFilters
  );

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(seoJsonLd) }}
      />
      {SHOW_HOME_HERO ? (
        <HomeHero
          categories={categories}
          cities={cities}
          selectedCategoryId={categoryId}
          selectedCityId={cityId}
          q={q}
        />
      ) : null}
      <HomeQuickLinksStrip />
      <div
        id="ilanlar"
        className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6"
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-6">
          <aside className="hidden w-full shrink-0 lg:sticky lg:top-[5.5rem] lg:flex lg:h-[calc(100dvh-5.5rem)] lg:max-h-[calc(100dvh-5.5rem)] lg:min-h-0 lg:w-[min(240px,18vw)] lg:min-w-[200px] lg:max-w-[260px] lg:flex-col lg:overflow-hidden lg:self-start">
            <HomeSidebar categories={categories} />
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              {categoryId && catMap.get(categoryId)?.name ? (
                <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
                  {catMap.get(categoryId)?.name}
                </h1>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <TopCitySelect cities={cities} />
                <ListingFilters />
              </div>
            </div>
            <p className="mb-4 text-sm text-zinc-600">
              {total} sonuç
              {cityId && cityMap.get(cityId)?.name
                ? ` · ${cityMap.get(cityId)?.name}`
                : ""}
              {vehicleBrandId && brandMap.get(vehicleBrandId)?.name
                ? ` · ${brandMap.get(vehicleBrandId)?.name}`
                : ""}
              {listFilters.vehicleModel
                ? ` · ${listFilters.vehicleModel}`
                : ""}
              {listFilters.bodyType ? ` · ${listFilters.bodyType}` : ""}
              {listFilters.vehicleEnginePackageId ? " · paket filtresi" : ""}
              {listFilters.q ? ` · “${listFilters.q}”` : ""}
            </p>
            <AdSenseUnit
              slot={ADSENSE_HOME_SLOT}
              className="mb-4 hidden sm:block"
              label="Sponsorlu"
            />

            {items.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Bu filtrelere uygun ilan yok.
              </p>
            ) : (
              <HomeListingsGrid
                initialItems={items}
                total={total}
                env={env}
                loggedIn={loggedIn}
                filters={listFilters}
              />
            )}
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
                Türkiye&apos;nin oto pazarı
                <span className="h-1 w-1 rounded-full bg-[#ffc400]" />
                İkinci el · Sıfır · Kiralık
              </p>

              <h1 className="mt-5 text-3xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl">
                <span className="text-[#ffc400]">Oto Pazarı</span>&apos;nda
                aracını bul, güvenle sat.
              </h1>

              <p className="mt-4 text-sm leading-relaxed text-white/80 sm:text-base">
                Oto Pazarı&apos;nda ikinci el araba ve sıfır otomobil ilanlarını
                filtrele; favorile ve satıcıyla hızlıca iletişime geç.
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
