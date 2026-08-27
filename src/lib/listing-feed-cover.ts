/** Ana sayfa ilan kartı kapak oranı — mobil `listing_feed_cover.dart` ile uyumlu. */

export const LISTING_FEED_GRID = {
  childAspectRatio: 0.55,
  crossAxisCount: 3,
  horizontalPadding: 24,
  crossSpacing: 8,
  cardFooterHeight: 76,
} as const;

export const MAX_LISTING_PHOTOS = 10;

export function coverAspectRatioForViewportWidth(screenWidth: number): number {
  const cellWidth =
    (screenWidth -
      LISTING_FEED_GRID.horizontalPadding -
      LISTING_FEED_GRID.crossSpacing * (LISTING_FEED_GRID.crossAxisCount - 1)) /
    LISTING_FEED_GRID.crossAxisCount;
  const cellHeight = cellWidth / LISTING_FEED_GRID.childAspectRatio;
  const imageHeight = cellHeight - LISTING_FEED_GRID.cardFooterHeight;
  if (imageHeight <= 0) return 6 / 7;
  return cellWidth / imageHeight;
}

export function coverAspectRatioLabel(screenWidth: number): string {
  const target = coverAspectRatioForViewportWidth(screenWidth);
  const candidates: [number, number][] = [
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [9, 10],
  ];
  let best = candidates[0];
  let bestDiff = Infinity;
  for (const [w, h] of candidates) {
    const diff = Math.abs(w / h - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [w, h];
    }
  }
  return `${best[0]}:${best[1]}`;
}

export function coverAspectRatioHintText(screenWidth: number): string {
  const ratioLabel = coverAspectRatioLabel(screenWidth);
  return `Kapak fotoğrafı ana sayfadaki ilan görseline tam uymalıdır: ${ratioLabel} (genişlik:yükseklik, dikey). Aracı ana sayfada göründüğü gibi çerçeveyi tam dolduracak şekilde çekin.`;
}

export function homeFeedPreviewCardWidth(screenWidth: number): number {
  return (
    (screenWidth -
      LISTING_FEED_GRID.horizontalPadding -
      LISTING_FEED_GRID.crossSpacing * (LISTING_FEED_GRID.crossAxisCount - 1)) /
    LISTING_FEED_GRID.crossAxisCount
  );
}
