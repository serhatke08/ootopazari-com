import Link from "next/link";
import type { SupabasePublicEnv } from "@/lib/env";
import type { HomeListingCardItem } from "@/lib/home-listings-feed-types";
import { HOME_ACIL_PRIORITY_SIZE } from "@/lib/home-grid-image-load";
import { ListingCard } from "@/components/ListingCard";

/** Ana sayfa ilk sıra: Acil İlanlar — kapaklar her zaman öncelikli yüklenir. */
export function HomeAcilRail({
  items,
  env,
  loggedIn,
}: {
  items: HomeListingCardItem[];
  env: SupabasePublicEnv;
  loggedIn: boolean;
}) {
  if (items.length === 0) return null;

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

      <div className="home-listings-grid">
        {items.map((item, index) => {
          const priority = index < HOME_ACIL_PRIORITY_SIZE;
          return (
            <div key={item.listing.id} className="min-w-0">
              <ListingCard
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
                coverPriority={priority}
                coverFastPath={priority}
                coverFetchPriority={priority ? "high" : "low"}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
