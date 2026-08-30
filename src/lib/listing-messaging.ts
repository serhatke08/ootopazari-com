import {
  listingActivatedAt,
  LISTING_ACTIVE_DAYS,
} from "@/lib/listing-quota";

const MS_DAY = 24 * 60 * 60 * 1000;

/** İlan detay + mesajlaşma: onaylı ve yayın penceresi içinde mi? */
export function isListingMessagingAllowed(
  listing:
    | {
        moderation_status?: string | null;
        activation_status?: string | null;
        activated_at?: unknown;
        created_at?: unknown;
      }
    | null
    | undefined
): boolean {
  if (!listing) return false;

  const moderation = String(listing.moderation_status ?? "approved")
    .trim()
    .toLowerCase();
  if (moderation !== "approved") return false;

  const activation = String(listing.activation_status ?? "active")
    .trim()
    .toLowerCase();
  if (
    activation === "passive_expired" ||
    activation === "passive_payment_required"
  ) {
    return false;
  }

  const liveSince = listingActivatedAt(listing);
  if (
    liveSince &&
    liveSince.getTime() < Date.now() - LISTING_ACTIVE_DAYS * MS_DAY
  ) {
    return false;
  }

  return true;
}

export function listingMessagingBlockedMessage(
  listing:
    | {
        moderation_status?: string | null;
        activation_status?: string | null;
        activated_at?: unknown;
        created_at?: unknown;
      }
    | null
    | undefined
): string {
  if (!listing) {
    return "Bu ilan artık aktif değil. Yeni mesaj gönderilemez.";
  }

  const moderation = String(listing.moderation_status ?? "")
    .trim()
    .toLowerCase();
  if (moderation === "suspended") {
    return "Bu ilan askıya alındı. Yeni mesaj gönderilemez.";
  }
  if (moderation === "pending") {
    return "Bu ilan onay bekliyor. Yeni mesaj gönderilemez.";
  }
  if (moderation === "expired" || moderation === "rejected") {
    return "Bu ilan yayında değil. Yeni mesaj gönderilemez.";
  }

  const activation = String(listing.activation_status ?? "active")
    .trim()
    .toLowerCase();
  if (activation === "passive_payment_required") {
    return "Bu ilan henüz yayına alınmamış. Mesaj gönderilemez.";
  }
  if (activation === "passive_expired") {
    return "Bu ilanın yayın süresi doldu. Yeni mesaj gönderilemez.";
  }

  const liveSince = listingActivatedAt(listing);
  if (
    liveSince &&
    liveSince.getTime() < Date.now() - LISTING_ACTIVE_DAYS * MS_DAY
  ) {
    return "Bu ilanın yayın süresi doldu. Yeni mesaj gönderilemez.";
  }

  return "Bu ilan artık mesajlaşmaya kapalı. Yeni mesaj gönderilemez.";
}
