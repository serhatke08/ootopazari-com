import type { SupabasePublicEnv } from "@/lib/env";
import type { HomeListingCardItem } from "@/lib/home-listings-feed-types";
import {
  HOME_ACIL_PRIORITY_SIZE,
  HOME_GRID_FIRST_ROW_SIZE,
} from "@/lib/home-grid-image-load";
import { listingCoverCandidateUrls } from "@/lib/storage";

function coverUrl(
  env: SupabasePublicEnv,
  item: HomeListingCardItem
): string | null {
  return (
    listingCoverCandidateUrls(env, item.listing.image_url, item.listing.id)[0] ??
    null
  );
}

/**
 * Viewport’taki Acil + ana grid ilk sıra kapaklarını HTML’de ısıtır.
 * Sıra: önce acil, sonra ilk sıra — tarayıcı bunları diğer görsellerden önce alır.
 */
export function HomeFeedImagePreloads({
  env,
  items,
  acilItems = [],
}: {
  env: SupabasePublicEnv;
  items: HomeListingCardItem[];
  acilItems?: HomeListingCardItem[];
}) {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const item of [
    ...acilItems.slice(0, HOME_ACIL_PRIORITY_SIZE),
    ...items.slice(0, HOME_GRID_FIRST_ROW_SIZE),
  ]) {
    const url = coverUrl(env, item);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }

  if (urls.length === 0) return null;

  return (
    <>
      {urls.map((url, index) => (
        <link
          key={`${url}-${index}`}
          rel="preload"
          as="image"
          href={url}
          // İlk birkaç görsel yüksek öncelik; gerisi de preload ama düşük.
          fetchPriority={index < 4 ? "high" : "low"}
        />
      ))}
    </>
  );
}
