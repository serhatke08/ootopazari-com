import "server-only";

export type ParsedFeatureBoostMerchantOid =
  | { kind: "single"; listingNumber: string; packDays: number }
  | { kind: "multi"; listingCount: number; packDays: number };

/** Tek ilan: FB{listingNumber}D{packDays}T{timestamp} */
export function buildFeatureBoostMerchantOid(
  listingNumber: string,
  packDays: number
): string {
  const oid = `FB${listingNumber}D${packDays}T${Date.now()}`;
  return oid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 64);
}

/** Çoklu ilan: FBM{count}D{packDays}T{timestamp} */
export function buildMultiFeatureBoostMerchantOid(
  listingCount: number,
  packDays: number
): string {
  const oid = `FBM${listingCount}D${packDays}T${Date.now()}`;
  return oid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 64);
}

export function parseFeatureBoostMerchantOid(
  merchantOid: string
): ParsedFeatureBoostMerchantOid | null {
  const oid = merchantOid.trim();
  const multi = /^FBM(\d+)D(\d+)T\d+$/i.exec(oid);
  if (multi) {
    const listingCount = Number(multi[1]);
    const packDays = Number(multi[2]);
    if (
      Number.isFinite(listingCount) &&
      listingCount > 0 &&
      Number.isFinite(packDays) &&
      packDays > 0
    ) {
      return { kind: "multi", listingCount, packDays };
    }
    return null;
  }

  const single = /^FB(\d+)D(\d+)T\d+$/i.exec(oid);
  if (!single) return null;
  const packDays = Number(single[2]);
  if (!Number.isFinite(packDays) || packDays <= 0) return null;
  return { listingNumber: single[1], packDays, kind: "single" };
}

/** PayTR IAP idempotency — çoklu ödemede ilan başına benzersiz transaction id. */
export function buildFeatureBoostPaytrTransactionId(
  merchantOid: string,
  listingNumber: string,
  multi: boolean
): string {
  if (!multi) return merchantOid.trim();
  const combined = `${merchantOid.trim()}#${listingNumber}`;
  return combined.replace(/[^a-zA-Z0-9#]/g, "").slice(0, 128);
}
