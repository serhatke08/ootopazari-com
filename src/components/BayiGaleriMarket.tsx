import Link from "next/link";
import type { DealerProfile } from "@/lib/bayi-types";
import type { CategoryRow, CityRow } from "@/lib/listings-data";
import type { SupabasePublicEnv } from "@/lib/env";
import type {
  HomeListingCardItem,
  HomeListingsFeedFilters,
} from "@/lib/home-listings-feed-types";
import { homeFeedFiltersToQueryString } from "@/lib/home-listings-feed-filters";
import { BayiCard } from "@/components/BayiCard";
import { ListingCard } from "@/components/ListingCard";
import { BayiDealerSortSelect } from "@/components/BayiDealerSortSelect";
import { ListingFilters } from "@/components/ListingFilters";
import { ListingSortSelect } from "@/components/ListingSortSelect";

type Props = {
  env: SupabasePublicEnv;
  dealers: DealerProfile[];
  cities: CityRow[];
  categories: CategoryRow[];
  items: HomeListingCardItem[];
  listingTotal: number;
  loggedIn: boolean;
  filters: HomeListingsFeedFilters;
  tab: "ilanlar" | "bayiler";
  q: string;
  cityId: string;
  dealerSort: string;
  applyHref?: string | null;
};

function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" aria-hidden>
      <path
        d="M4.5 16.5v1.2a1.3 1.3 0 0 0 1.3 1.3h1.4a1.3 1.3 0 0 0 1.3-1.3v-.4h7v.4a1.3 1.3 0 0 0 1.3 1.3h1.4a1.3 1.3 0 0 0 1.3-1.3v-1.2M4.5 16.5h15M4.5 16.5l1.2-5.1A2 2 0 0 1 7.64 10h8.72a2 2 0 0 1 1.94 1.4l1.2 5.1M7.5 10 8.4 7.4A1.5 1.5 0 0 1 9.8 6.5h4.4a1.5 1.5 0 0 1 1.4.9L16.5 10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" aria-hidden>
      <path
        d="M4 10.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8.5M4 10.5 5.5 5h13L20 10.5M4 10.5h16M9 20v-5h6v5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BayiGaleriMarket({
  env,
  dealers,
  cities,
  categories,
  items,
  listingTotal,
  loggedIn,
  filters,
  tab,
  q,
  cityId,
  dealerSort,
  applyHref,
}: Props) {
  const listingsActive = tab === "ilanlar";
  const base = "/bayi/galeri";
  const searchValue = filters.q ?? q;
  const cityValue = filters.cityId ?? cityId;

  const tabHref = (next: "ilanlar" | "bayiler") => {
    const p = new URLSearchParams(homeFeedFiltersToQueryString(filters));
    p.set("tab", next);
    if (searchValue) p.set("q", searchValue);
    if (cityValue) p.set("city_id", cityValue);
    if (next === "bayiler" && dealerSort && dealerSort !== "newest") {
      p.set("dealer_sort", dealerSort);
    }
    if (next === "ilanlar") p.delete("dealer_sort");
    const qs = p.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const filterExtra = {
    tab: listingsActive ? "ilanlar" : "bayiler",
    ...(searchValue ? { q: searchValue } : {}),
    ...(cityValue ? { city_id: cityValue } : {}),
  };

  return (
    <div className="bg-white pb-4 md:bg-transparent">
      <div className="grid h-12 grid-cols-[1fr_auto_1fr] items-center bg-[#5D17EB] px-1 text-white md:hidden">
        <span aria-hidden />
        <h1 className="truncate px-2 text-center text-[17px] font-bold uppercase tracking-[0.6px]">
          Galeri
        </h1>
        <div className="flex items-center justify-end">
          {applyHref ? (
            <Link
              href={applyHref}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full"
              aria-label="Bayi başvurusu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                <path
                  d="M4 10.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8.5M4 10.5 5.5 5h13L20 10.5M4 10.5h16M9 20v-5h6v5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          ) : null}
          <ListingFilters
            categories={categories}
            applied={filters}
            basePath={base}
            extraParams={filterExtra}
            variant="appbar"
          />
        </div>
      </div>

      <form className="px-4 pt-2.5 md:px-0" method="get" action={base} data-galeri-browse="1">
        <input type="hidden" name="tab" value={tab} />
        {listingsActive ? null : (
          <input type="hidden" name="dealer_sort" value={dealerSort} />
        )}
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-[3]">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="m16 16 4 4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              type="search"
              name="q"
              defaultValue={searchValue}
              placeholder="Bayi, ilan veya şehir ara"
              className="w-full rounded-[14px] border border-zinc-300 bg-white py-[11px] pl-9 pr-3 text-sm font-medium text-zinc-900 outline-none focus:border-[#5D17EB]"
            />
          </div>
          <label className="relative min-w-0 flex-[2]">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
                <path d="M12 2.25c-3.87 0-7 3.13-7 7 0 5.25 7 12.5 7 12.5s7-7.25 7-12.5c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
              </svg>
            </span>
            <select
              name="city_id"
              defaultValue={cityValue}
              className={`w-full appearance-none rounded-[14px] border bg-white py-[11px] pl-9 pr-8 text-sm font-semibold outline-none ${
                cityValue
                  ? "border-[#5D17EB]/55 text-[#5D17EB]"
                  : "border-zinc-300 text-zinc-800"
              }`}
            >
              <option value="">Tüm şehirler</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-zinc-500">
              ▾
            </span>
          </label>
          <button type="submit" className="sr-only">
            Ara
          </button>
        </div>
      </form>

      <div className="px-4 pt-3 md:px-0">
        <div className="grid grid-cols-2 overflow-hidden rounded-full bg-zinc-100 p-[3px]">
          <Link
            href={tabHref("ilanlar")}
            className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-semibold ${
              listingsActive
                ? "bg-[#5D17EB] text-white"
                : "text-zinc-800"
            }`}
          >
            <CarIcon />
            Araçlar{" "}
            <span className="font-extrabold">{listingTotal}</span>
          </Link>
          <Link
            href={tabHref("bayiler")}
            className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-semibold ${
              !listingsActive
                ? "bg-[#5D17EB] text-white"
                : "text-zinc-800"
            }`}
          >
            <StoreIcon />
            Bayiler{" "}
            <span className="font-extrabold">{dealers.length}</span>
          </Link>
        </div>
      </div>

      {listingsActive ? (
        <>
          <div className="mt-3 hidden items-center justify-end gap-2 px-4 md:flex md:px-0">
            <ListingSortSelect />
            <ListingFilters
              categories={categories}
              applied={filters}
              basePath={base}
              extraParams={filterExtra}
            />
          </div>

          <div className="mt-3 px-4 md:px-0">
            {items.length > 0 ? (
              <div className="home-listings-grid">
                {items.map((item) => (
                  <ListingCard
                    key={item.listing.id ?? String(item.listing.listing_number)}
                    listing={item.listing}
                    env={env}
                    categoryName={item.categoryName}
                    brandName={item.brandName}
                    hideCategoryAndYear
                    cityOnStatsRow
                    showFavorite={false}
                    cityDisplayName={item.cityDisplayName}
                    stats={item.stats}
                    loggedIn={loggedIn}
                    favorited={item.favorited}
                    ownerName={item.ownerName}
                    ownerAvatarSrc={item.ownerAvatarSrc}
                    ownerHref={item.ownerHref}
                    priceRating={item.priceRating}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-[#5D17EB]/20 bg-[#5D17EB]/5 px-5 py-8 text-center">
                <svg
                  viewBox="0 0 24 24"
                  className="mx-auto h-9 w-9 text-[#5D17EB]/50"
                  fill="none"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                  <path
                    d="m16 16 4 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8.2 8.2 13.8 13.8M13.8 8.2 8.2 13.8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                <p className="mt-2 text-sm font-bold text-zinc-900">
                  Araçlar bulunamadı
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Henüz ilan yok veya şehir filtresi uygulandı.
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <form
            className="mt-3 hidden justify-end px-4 md:flex md:px-0"
            method="get"
            action={base}
          >
            <input type="hidden" name="tab" value="bayiler" />
            <input type="hidden" name="q" value={searchValue} />
            <input type="hidden" name="city_id" value={cityValue} />
            <BayiDealerSortSelect defaultValue={dealerSort} />
          </form>

          <div className="mt-3.5 space-y-3.5 px-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:grid-cols-3 md:px-0">
            {dealers.length > 0 ? (
              dealers.map((dealer) => (
                <BayiCard
                  key={dealer.id}
                  dealer={dealer}
                  dealerType="galeri"
                  supabaseUrl={env.url}
                />
              ))
            ) : (
              <div className="rounded-xl border border-[#5D17EB]/20 bg-[#5D17EB]/5 px-5 py-8 text-center md:col-span-2 xl:col-span-3">
                <p className="text-sm font-bold text-zinc-900">Galeri bulunamadı</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Şehir veya aramayı değiştirip tekrar dene.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
