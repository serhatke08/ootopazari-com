import Link from "next/link";
import type { SupabasePublicEnv } from "@/lib/env";
import type { HomeListingCardItem } from "@/lib/home-listings-feed-types";
import { ListingCard } from "@/components/ListingCard";

/** Ana sayfa ilk sıra: Acil İlanlar — mobil grid kadar, PC’de 6’ya kadar (boş slot yok). */
export function HomeAcilRail({
  items,
  env,
  loggedIn,
  deferCovers = false,
}: {
  items: HomeListingCardItem[];
  env: SupabasePublicEnv;
  loggedIn: boolean;
  /** Ana grid ilk sırası bitene kadar görselleri beklet. */
  deferCovers?: boolean;
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
        {items.map((item) => (
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
              coverDefer={deferCovers}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
