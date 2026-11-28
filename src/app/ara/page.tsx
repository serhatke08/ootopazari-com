import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import { fetchHomeListingsFeed } from "@/lib/home-listings-feed";
import { HOME_LISTINGS_PAGE_SIZE } from "@/lib/home-listings-feed-types";
import { resolveHomeListingsFeedFilters } from "@/lib/home-listings-feed-filters";
import { listingNumberFromSearchQuery } from "@/lib/listing-number-search";
import { HomeListingsGrid } from "@/components/HomeListingsGrid";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  return {
    title: q ? `${q} — Arama` : "Arama",
    robots: { index: false, follow: true },
  };
}

export default async function AraPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-12 sm:px-6">
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
  const listingNo = listingNumberFromSearchQuery(q);
  if (listingNo) {
    redirect(`/ilan/${listingNo}`);
  }

  const supabase = await createSupabaseServerClient();
  const filters = await resolveHomeListingsFeedFilters(supabase, get);
  const feed = q
    ? await fetchHomeListingsFeed(
        supabase,
        env,
        1,
        HOME_LISTINGS_PAGE_SIZE,
        filters,
        { lite: true }
      )
    : { items: [], total: 0, loggedIn: false };

  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-4 sm:px-6">
      <form method="get" action="/ara" role="search" className="flex gap-2">
        <label htmlFor="ara-q" className="sr-only">
          İlan ara
        </label>
        <input
          id="ara-q"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Marka, model, ilan no…"
          autoComplete="off"
          autoFocus
          enterKeyHint="search"
          className="min-w-0 flex-1 rounded-2xl border-0 bg-zinc-100 px-4 py-3.5 text-base font-medium text-zinc-900 outline-none ring-1 ring-transparent placeholder:font-normal placeholder:text-zinc-400 focus:bg-white focus:ring-zinc-900/20"
        />
        <button
          type="submit"
          className="shrink-0 rounded-2xl bg-zinc-900 px-5 text-sm font-extrabold text-white"
        >
          Ara
        </button>
      </form>

      <div className="mt-5">
        {!q ? (
          <p className="px-1 text-sm text-zinc-500">
            İlan, marka veya model ara. Sonuçlar burada açılır.
          </p>
        ) : feed.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-12 text-center">
            <p className="text-sm font-semibold text-zinc-900">
              Sonuç bulunamadı
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              “{q}” için ilan yok. Başka bir arama dene.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm font-semibold text-zinc-700">
              {feed.total} sonuç
            </p>
            <HomeListingsGrid
              key={q}
              initialItems={feed.items}
              total={feed.total}
              env={env}
              loggedIn={feed.loggedIn}
              filters={filters}
            />
          </>
        )}
      </div>
    </div>
  );
}
