import Link from "next/link";
import type { SupabasePublicEnv } from "@/lib/env";
import type { HomeListingCardItem } from "@/lib/home-listings-feed-types";
import { ListingCard } from "@/components/ListingCard";
import type { SpecialListingKind } from "@/lib/special-listings-feed";

const COPY: Record<
  SpecialListingKind,
  { title: string; subtitle: string; empty: string; accent: string }
> = {
  acil: {
    title: "Acil İlanlar",
    subtitle:
      "Bugün öne çıkarılan, acil görünürlükteki araç ilanları.",
    empty: "Şu an aktif acil ilan yok.",
    accent: "border-red-200 bg-red-50",
  },
  vitrin: {
    title: "Vitrin",
    subtitle: "Öne çıkarma paketindeki vitrin ilanları.",
    empty: "Şu an vitrinde ilan yok.",
    accent: "border-teal-200 bg-teal-50",
  },
};

export function SpecialListingsPageView({
  kind,
  items,
  env,
  loggedIn,
}: {
  kind: SpecialListingKind;
  items: HomeListingCardItem[];
  env: SupabasePublicEnv;
  loggedIn: boolean;
}) {
  const copy = COPY[kind];

  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
      <div className={`mb-6 rounded-xl border p-5 sm:p-6 ${copy.accent}`}>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-zinc-700 sm:text-base">
          {copy.subtitle}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/ilan-one-cikar"
            className="rounded-lg bg-[#ffc400] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#ffd24d]"
          >
            İlanımı öne çıkar
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400"
          >
            Ana sayfa
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-12 text-center">
          <p className="text-sm text-zinc-600">{copy.empty}</p>
          <Link
            href="/ilan-one-cikar"
            className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline"
          >
            Öne çıkarma paketlerine göz at
          </Link>
        </div>
      ) : (
        <div className="home-listings-grid">
          {items.map((item) => (
            <ListingCard
              key={item.listing.id ?? String(item.listing.listing_number)}
              listing={item.listing}
              env={env}
              categoryName={item.categoryName}
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
      )}
    </div>
  );
}
