import Link from "next/link";
import type { SupabasePublicEnv } from "@/lib/env";
import type { HomeListingCardItem } from "@/lib/home-listings-feed-types";
import { ListingCard } from "@/components/ListingCard";

/** Ana sayfa ilk sıra: Acil İlanlar > + 3 kart (boş olabilir). */
export function HomeAcilRail({
  items,
  env,
  loggedIn,
}: {
  items: HomeListingCardItem[];
  env: SupabasePublicEnv;
  loggedIn: boolean;
}) {
  const slots = Array.from({ length: 3 }, (_, i) => items[i] ?? null);

  return (
    <section className="mb-3" aria-label="Acil ilanlar">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Link
          href="/acil"
          className="group inline-flex items-center gap-1 text-sm font-bold text-[#8b0000] sm:text-base"
        >
          <span className="border-b-2 border-[#8b0000] pb-0.5 group-hover:border-[#a40000]">
            Acil İlanlar
          </span>
          <span aria-hidden className="text-[#8b0000] transition group-hover:translate-x-0.5">
            ›
          </span>
        </Link>
      </div>

      <div className="home-acil-grid">
        {slots.map((item, i) =>
          item ? (
            <ListingCard
              key={item.listing.id ?? String(item.listing.listing_number)}
              listing={item.listing}
              env={env}
              categoryName={item.categoryName}
              hideCategoryAndYear
              cityOnStatsRow
              showFavorite={false}
              showAcilBadge
              cityDisplayName={item.cityDisplayName}
              stats={item.stats}
              loggedIn={loggedIn}
              favorited={item.favorited}
              ownerName={item.ownerName}
              ownerAvatarSrc={item.ownerAvatarSrc}
              ownerHref={item.ownerHref}
              priceRating={item.priceRating}
            />
          ) : (
            <div
              key={`acil-empty-${i}`}
              className="flex min-h-[10rem] flex-col items-center justify-center rounded-lg border border-dashed border-red-200/80 bg-red-50/40 px-2 py-6 text-center sm:min-h-[12rem]"
              aria-hidden={true}
            />
          )
        )}
      </div>
    </section>
  );
}
