import type { SupabasePublicEnv } from "@/lib/env";
import type { HomeListingCardItem } from "@/lib/home-listings-feed-types";
import { HOME_GRID_FIRST_ROW_SIZE } from "@/lib/home-grid-image-load";
import { listingCoverCandidateUrls } from "@/lib/storage";

/** İlk sıra kapak görsellerini HTML’de önceden ısıtır (sırayla, soldan sağa). */
export function HomeFeedImagePreloads({
  env,
  items,
}: {
  env: SupabasePublicEnv;
  items: HomeListingCardItem[];
}) {
  const urls = items
    .slice(0, HOME_GRID_FIRST_ROW_SIZE)
    .map((item) =>
      listingCoverCandidateUrls(
        env,
        item.listing.image_url,
        item.listing.id
      )[0]
    )
    .filter((url): url is string => Boolean(url));

  if (urls.length === 0) return null;

  return (
    <>
      {urls.map((url, index) => (
        <link
          key={`${url}-${index}`}
          rel="preload"
          as="image"
          href={url}
          fetchPriority={index === 0 ? "high" : "low"}
        />
      ))}
    </>
  );
}
