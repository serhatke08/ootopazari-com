import type { ListingRow } from "@/lib/listings-data";

/** Mobil uygulama ile aynı: günlük pulse penceresi 24 saat. */
export const FEATURE_BOOST_HOURS_BETWEEN = 24;

export const FEATURE_BOOST_PACKS = [
  {
    productId: "feature_boost_one_time",
    days: 1,
    label: "1 gün",
    subtitle: "Tek seferlik",
    fallbackPriceTry: 29.99,
  },
  {
    productId: "feature_boost_3d_24h",
    days: 3,
    label: "3 gün",
    subtitle: "Günde 24 saat öne çıkar",
    fallbackPriceTry: 79.99,
  },
  {
    productId: "feature_boost_7d_24h",
    days: 7,
    label: "7 gün",
    subtitle: "Günde 24 saat öne çıkar",
    fallbackPriceTry: 149.99,
  },
  {
    productId: "feature_boost_10d_24h",
    days: 10,
    label: "10 gün",
    subtitle: "Günde 24 saat öne çıkar",
    fallbackPriceTry: 199.99,
  },
  {
    productId: "feature_boost_15d_24h",
    days: 15,
    label: "15 gün",
    subtitle: "Günde 24 saat öne çıkar",
    fallbackPriceTry: 279,
  },
  {
    productId: "feature_boost_30d_24h",
    days: 30,
    label: "30 gün",
    subtitle: "Günde 24 saat öne çıkar",
    fallbackPriceTry: 399,
  },
] as const;

export function featureBoostProductIdForPackDays(packDays: number): string | null {
  const pack = FEATURE_BOOST_PACKS.find((p) => p.days === packDays);
  return pack?.productId ?? null;
}

export type FeatureBoostOwnerPhase =
  | "pulseActive"
  | "waitingNextPulse"
  | "packDaysDone"
  | "ended"
  | "legacyActive"
  | "none";

type PulseWindow = {
  active: boolean;
  pulseIndex: number;
  pulseStart: Date | null;
  pulseEnd: Date | null;
};

export function parseListingDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function listingFeatureBoostFields(listing: ListingRow) {
  const featuredUntil = parseListingDate(listing.featured_until);
  const featuredStartedAt = parseListingDate(listing.featured_started_at);
  const campaignStart =
    parseListingDate(listing.feature_boost_campaign_start_at) ??
    featuredStartedAt;
  const packDaysRaw = Number(listing.feature_boost_pack_days);
  const packDays =
    Number.isFinite(packDaysRaw) && packDaysRaw > 0 ? packDaysRaw : 0;

  return {
    featuredUntil,
    featuredStartedAt,
    campaignStart,
    packDays,
  };
}

function msPerPulse(): number {
  return FEATURE_BOOST_HOURS_BETWEEN * 60 * 60 * 1000;
}

export function getCurrentPulseWindow(
  campaignStart: Date,
  packDays: number,
  now: Date
): PulseWindow | null {
  const elapsed = now.getTime() - campaignStart.getTime();
  if (elapsed < 0) return null;

  const pulseIndex = Math.floor(elapsed / msPerPulse());
  if (pulseIndex >= packDays) {
    return {
      active: false,
      pulseIndex,
      pulseStart: null,
      pulseEnd: null,
    };
  }

  const pulseStart = new Date(campaignStart.getTime() + pulseIndex * msPerPulse());
  const pulseEnd = new Date(pulseStart.getTime() + msPerPulse());
  const active = now >= pulseStart && now < pulseEnd;

  return { active, pulseIndex, pulseStart, pulseEnd };
}

export function getNextPulseStart(
  campaignStart: Date,
  packDays: number,
  now: Date
): Date | null {
  const elapsed = now.getTime() - campaignStart.getTime();
  if (elapsed < 0) return campaignStart;

  const currentIndex = Math.floor(elapsed / msPerPulse());
  const nextIndex = currentIndex + 1;
  if (nextIndex >= packDays) return null;

  return new Date(campaignStart.getTime() + nextIndex * msPerPulse());
}

/** Ana sayfa sarı çerçeve / şimşek — yalnızca bugünkü pulse aktifken. */
export function listingHomeBoostChromeActive(
  listing: ListingRow,
  now = new Date()
): boolean {
  const { featuredUntil, campaignStart, packDays } =
    listingFeatureBoostFields(listing);

  if (!featuredUntil || now >= featuredUntil) return false;

  if (!campaignStart || packDays <= 0) {
    return true;
  }

  const pulse = getCurrentPulseWindow(campaignStart, packDays, now);
  return pulse?.active ?? false;
}

/** Ana sayfa sıralama zamanı — pulse aktifse o günün pulse başlangıcı; değilse created_at.
 *  Böylece öne çıkan ilan bir kez yukarı zıplar; sonrasında daha yeni ilanlar üstüne geçer. */
export function listingFeedSortNewestAt(
  listing: ListingRow,
  now = new Date()
): number {
  const created = parseListingDate(listing.created_at)?.getTime() ?? 0;

  if (!listingHomeBoostChromeActive(listing, now)) {
    return created;
  }

  const { campaignStart, packDays, featuredStartedAt } =
    listingFeatureBoostFields(listing);

  if (!campaignStart || packDays <= 0) {
    return featuredStartedAt?.getTime() ?? created;
  }

  const pulse = getCurrentPulseWindow(campaignStart, packDays, now);
  return pulse?.pulseStart?.getTime() ?? created;
}

export function sortListingsByFeedNewest(
  listings: ListingRow[],
  now = new Date()
): ListingRow[] {
  return [...listings].sort((a, b) => {
    const diff = listingFeedSortNewestAt(b, now) - listingFeedSortNewestAt(a, now);
    if (diff !== 0) return diff;
    const nb = Number(b.listing_number ?? 0);
    const na = Number(a.listing_number ?? 0);
    return nb - na;
  });
}

export function listingFeatureBoostOwnerPhase(
  listing: ListingRow,
  now = new Date()
): FeatureBoostOwnerPhase {
  const { featuredUntil, campaignStart, packDays } =
    listingFeatureBoostFields(listing);

  if (!featuredUntil || now >= featuredUntil) {
    return featuredUntil ? "ended" : "none";
  }

  if (!campaignStart || packDays <= 0) {
    return "legacyActive";
  }

  const pulse = getCurrentPulseWindow(campaignStart, packDays, now);
  if (pulse?.active) return "pulseActive";

  const elapsed = now.getTime() - campaignStart.getTime();
  const completedPulses = Math.floor(elapsed / msPerPulse());
  if (completedPulses >= packDays) return "packDaysDone";

  return "waitingNextPulse";
}

export function formatFeatureBoostDate(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Kart ve özet alanları için: tarih ve saat ayrı satır. */
export function formatFeatureBoostEndDisplay(
  d: Date | null,
  now = new Date()
): { dateLine: string; timeLine: string; remainingLabel: string | null } | null {
  if (!d) return null;

  const dateLine = d.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeLine = d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const msLeft = d.getTime() - now.getTime();
  let remainingLabel: string | null = null;
  if (msLeft <= 0) {
    remainingLabel = "Süre doldu";
  } else {
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
    if (daysLeft === 1) remainingLabel = "Son gün";
    else if (daysLeft <= 30) remainingLabel = `${daysLeft} gün kaldı`;
    else {
      const months = Math.floor(daysLeft / 30);
      remainingLabel = months === 1 ? "1 ay kaldı" : `${months} ay kaldı`;
    }
  }

  return { dateLine, timeLine, remainingLabel };
}

export function featureBoostOwnerStatusCopy(
  listing: ListingRow,
  now = new Date()
): { title: string; detail: string | null; tone: "amber" | "zinc" | "green" } {
  const phase = listingFeatureBoostOwnerPhase(listing, now);
  const { featuredUntil, campaignStart, packDays } =
    listingFeatureBoostFields(listing);

  switch (phase) {
    case "pulseActive":
      return {
        title: "Öne çıkarma aktif",
        detail: featuredUntil
          ? `Bugün ana sayfada öne çıkarılıyor · Bitiş: ${formatFeatureBoostDate(featuredUntil)}${packDays > 0 ? ` · ${packDays} gün paket` : ""}`
          : "İlanınız bugün ana sayfada öne çıkarılıyor.",
        tone: "amber",
      };
    case "waitingNextPulse": {
      const next =
        campaignStart && packDays > 0
          ? getNextPulseStart(campaignStart, packDays, now)
          : null;
      return {
        title: "Sonraki pulse bekleniyor",
        detail: [
          next ? `Bir sonraki öne çıkarma: ${formatFeatureBoostDate(next)}` : null,
          featuredUntil
            ? `Kampanya bitişi: ${formatFeatureBoostDate(featuredUntil)}`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
        tone: "zinc",
      };
    }
    case "packDaysDone":
      return {
        title: "Paket günleri tamamlandı",
        detail: featuredUntil
          ? `Kampanya bitişi: ${formatFeatureBoostDate(featuredUntil)}`
          : null,
        tone: "zinc",
      };
    case "legacyActive":
      return {
        title: "Öne çıkarma aktif",
        detail: featuredUntil
          ? `Bitiş: ${formatFeatureBoostDate(featuredUntil)}`
          : null,
        tone: "amber",
      };
    case "ended":
      return {
        title: "Öne çıkarma bitti",
        detail: null,
        tone: "zinc",
      };
    default:
      return {
        title: "Öne çıkarılmıyor",
        detail: "İlanınızı ana sayfada öne taşımak için paket seçin.",
        tone: "zinc",
      };
  }
}

export function formatTryPrice(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(amount);
}
