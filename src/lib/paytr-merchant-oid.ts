import "server-only";

/** PayTR merchant_oid: FB{listingNumber}D{packDays}T{timestamp} */
export function buildFeatureBoostMerchantOid(
  listingNumber: string,
  packDays: number
): string {
  const oid = `FB${listingNumber}D${packDays}T${Date.now()}`;
  return oid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 64);
}

export function parseFeatureBoostMerchantOid(
  merchantOid: string
): { listingNumber: string; packDays: number } | null {
  const m = /^FB(\d+)D(\d+)T\d+$/i.exec(merchantOid.trim());
  if (!m) return null;
  const packDays = Number(m[2]);
  if (!Number.isFinite(packDays) || packDays <= 0) return null;
  return { listingNumber: m[1], packDays };
}
