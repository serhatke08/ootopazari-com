/**
 * Otopazar vitrin sıralaması — mobil `lib/utils/feature_boost_month.dart` ile aynı mantık.
 * Uygulama kodu: `src/lib/listing-feed-sort.ts` (bu dosya referans kopyası).
 */

export type ListingRow = Record<string, unknown>;

function parseDate(raw: unknown): Date | null {
  if (raw == null) return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function listingFeaturedUntilActive(featuredUntilRaw: unknown): boolean {
  const dt = parseDate(featuredUntilRaw);
  return dt != null && dt.getTime() > Date.now();
}

function packDaysFromListing(listing: ListingRow): number | null {
  const raw = listing.feature_boost_pack_days;
  if (typeof raw === "number" && raw > 0) return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    if (n > 0) return n;
  }
  return null;
}

function campaignStartFromListing(listing: ListingRow): Date | null {
  return parseDate(
    listing.feature_boost_campaign_start_at ?? listing.featured_started_at,
  );
}

function resolvedPackDays(listing: ListingRow): number {
  const explicit = packDaysFromListing(listing);
  if (explicit != null) return explicit;

  const start = campaignStartFromListing(listing);
  const until = parseDate(listing.featured_until);
  if (start == null || until == null || until.getTime() <= start.getTime()) return 1;

  const hours = (until.getTime() - start.getTime()) / 3_600_000;
  return Math.min(30, Math.max(1, Math.ceil(hours / 24)));
}

function todayBoostPulseWindow(
  listing: ListingRow,
): { pulseStart: Date; pulseEnd: Date } | null {
  if (!listingFeaturedUntilActive(listing.featured_until)) return null;

  const campaignStart = campaignStartFromListing(listing);
  if (campaignStart == null) return null;

  const packDays = resolvedPackDays(listing);
  const now = Date.now();
  const elapsedHours = (now - campaignStart.getTime()) / 3_600_000;
  if (elapsedHours < 0) return null;

  const dayIndex = Math.floor(elapsedHours / 24);
  if (dayIndex >= packDays) return null;

  const pulseStart = new Date(campaignStart.getTime() + dayIndex * 24 * 3_600_000);
  const pulseEnd = new Date(pulseStart.getTime() + 24 * 3_600_000);
  if (now >= pulseEnd.getTime() || now < pulseStart.getTime()) return null;

  return { pulseStart, pulseEnd };
}

function listingFeatureBoostFullyEnded(listing: ListingRow): boolean {
  if (todayBoostPulseWindow(listing) != null) return false;

  const campaignStart = campaignStartFromListing(listing);
  const until = parseDate(listing.featured_until);

  if (campaignStart == null && until == null) return false;

  if (until != null && until.getTime() > Date.now()) {
    if (campaignStart == null) return false;
    const packDays = resolvedPackDays(listing);
    const dayIndex = Math.floor(
      (Date.now() - campaignStart.getTime()) / 3_600_000 / 24,
    );
    return dayIndex >= packDays;
  }

  return campaignStart != null || until != null;
}

function listingFeatureBoostStickySortAt(listing: ListingRow): Date | null {
  if (!listingFeatureBoostFullyEnded(listing)) return null;

  const campaignStart = campaignStartFromListing(listing);
  if (campaignStart != null) {
    const packDays = resolvedPackDays(listing);
    return new Date(campaignStart.getTime() + (packDays - 1) * 24 * 3_600_000);
  }

  const until = parseDate(listing.featured_until);
  if (until != null && until.getTime() <= Date.now()) return until;
  return null;
}

export function listingFeedSortNewestAt(listing: ListingRow): Date {
  const createdAt = parseDate(listing.created_at) ?? new Date(0);

  const pulse = todayBoostPulseWindow(listing);
  if (pulse != null) {
    return createdAt.getTime() > pulse.pulseStart.getTime()
      ? createdAt
      : pulse.pulseStart;
  }

  const stickyAt = listingFeatureBoostStickySortAt(listing);
  if (stickyAt != null) {
    return createdAt.getTime() > stickyAt.getTime() ? createdAt : stickyAt;
  }

  return createdAt;
}

export function listingQualityIsDemoted(listing: ListingRow): boolean {
  const v = listing.quality_demoted_at;
  return v != null && String(v).trim() !== "";
}

export function listingCoverQualityScore(listing: ListingRow): number | null {
  const raw = listing.cover_quality_score;
  if (raw == null) return null;
  if (typeof raw === "number") return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function listingCoverQualitySortTier(listing: ListingRow): number {
  if (listing.feed_sort_tier != null) {
    const t = Number(listing.feed_sort_tier);
    if (Number.isFinite(t)) return t;
  }

  const score = listingCoverQualityScore(listing);
  if (score == null) return listingQualityIsDemoted(listing) ? 1 : 0;
  if (score < 5) return 2;
  if (score <= 8) return 1;
  return 0;
}

export function compareListingFeedSort(a: ListingRow, b: ListingRow): number {
  const tierA = listingCoverQualitySortTier(a);
  const tierB = listingCoverQualitySortTier(b);
  if (tierA !== tierB) return tierA - tierB;

  const sa = listingCoverQualityScore(a);
  const sb = listingCoverQualityScore(b);
  if (sa != null || sb != null) {
    const na = sa ?? -1;
    const nb = sb ?? -1;
    if (na !== nb) return nb - na;
  }

  const demoteA = listingQualityIsDemoted(a) ? 1 : 0;
  const demoteB = listingQualityIsDemoted(b) ? 1 : 0;
  if (demoteA !== demoteB) return demoteA - demoteB;

  const da = listingFeedSortNewestAt(a).getTime();
  const db = listingFeedSortNewestAt(b).getTime();
  if (db !== da) return db - da;

  return String(a.id ?? "").localeCompare(String(b.id ?? ""));
}

export function assignFeedRanks<T extends ListingRow>(
  listings: T[],
): (T & { feed_rank: number })[] {
  const sorted = [...listings].sort(compareListingFeedSort);
  return sorted.map((row, index) => ({ ...row, feed_rank: index + 1 }));
}

export function feedSortTierLabel(tier: number, tr = true): string {
  if (tier === 0) return tr ? "Üst vitrin" : "Top feed";
  if (tier === 1) return tr ? "Düşük görünürlük" : "Reduced visibility";
  return tr ? "Pasif" : "Passive";
}
