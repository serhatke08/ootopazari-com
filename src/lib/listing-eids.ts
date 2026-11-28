export function listingEidsVerified(listing: Record<string, unknown>): boolean {
  const status = String(listing.eids_status ?? "").trim().toLowerCase();
  if (status === "verified") return true;
  const at = listing.eids_verified_at;
  return at != null && String(at).trim() !== "";
}

export function listingEidsPending(listing: Record<string, unknown>): boolean {
  const status = String(listing.eids_status ?? "").trim().toLowerCase();
  return status === "pending" || status === "skipped";
}

/** Sahip, pasif ilanda e-Devlet / plaka doğrulamasını bitirmeli. */
export function listingNeedsOwnerEids(
  listing: Record<string, unknown>
): boolean {
  if (listingEidsVerified(listing)) return false;
  if (listingEidsPending(listing)) return true;
  const live =
    String(listing.activation_status ?? "active").trim().toLowerCase() ===
    "active";
  if (live) return false;
  const plate = String(listing.vehicle_plate ?? "").trim();
  return plate.length > 0;
}

export function isAdminSupportShellListing(
  listing: Record<string, unknown>
): boolean {
  const title = String(listing.title ?? "").trim().toLowerCase();
  const desc = String(listing.description ?? "").toLowerCase();
  return title === "destek" && desc.includes("sistem ilanı");
}
