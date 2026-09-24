import type { Metadata } from "next";
import Link from "next/link";
import { MissingEnv } from "@/components/MissingEnv";
import { ListingCard } from "@/components/ListingCard";
import { SeoHubContent } from "@/components/SeoHubContent";
import { tryGetSupabaseEnv } from "@/lib/env";
import {
  fetchHomeListingsFeed,
  HOME_LISTINGS_PAGE_SIZE,
} from "@/lib/home-listings-feed";
import { getSeoHubBySlug } from "@/lib/seo-hubs";
import { SITE_DISPLAY_NAME } from "@/lib/seo-brand";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const hub = getSeoHubBySlug("ikinci-el-arac")!;

export const metadata: Metadata = {
  title: hub.title,
  description: hub.description,
  alternates: { canonical: hub.path },
  openGraph: {
    title: `${hub.title} | ${SITE_DISPLAY_NAME}`,
    description: hub.description,
    url: hub.path,
    type: "website",
  },
};

export default async function IkinciElAracPage() {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { items, loggedIn } = await fetchHomeListingsFeed(
    supabase,
    env,
    1,
    HOME_LISTINGS_PAGE_SIZE,
    {},
    { lite: true }
  );

  return (
    <SeoHubContent hub={hub}>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-600">
          Şu an listelenecek ikinci el ilan yok.{" "}
          <Link href="/ilan-ver" className="font-semibold underline">
            Ücretsiz ilan ver
          </Link>
        </p>
      ) : (
        <>
          <h2 className="mb-3 text-lg font-bold text-zinc-900">
            Güncel ikinci el ilanlar
          </h2>
          <div className="home-listings-grid">
            {items.map((item, index) => (
              <ListingCard
                key={item.listing.id ?? index}
                listing={item.listing}
                env={env}
                categoryName={item.categoryName}
                brandName={item.brandName}
                cityDisplayName={item.cityDisplayName}
                stats={item.stats}
                loggedIn={loggedIn}
                favorited={item.favorited}
                hideCategoryAndYear
                cityOnStatsRow
                coverPriority={index < 4}
              />
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-sm font-semibold text-zinc-800 underline"
            >
              Tüm ilanları ana sayfada filtrele
            </Link>
          </div>
        </>
      )}
    </SeoHubContent>
  );
}
