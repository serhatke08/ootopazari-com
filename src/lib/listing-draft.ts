/** App + web ortak ilan taslağı (aynı JSON şema). */

export type ListingDraftPayload = {
  categoryId?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  vehicleYear?: number | null;
  brandId?: string | null;
  brandName?: string | null;
  brandCode?: string | null;
  modelId?: string | null;
  modelName?: string | null;
  bodyStyleId?: string | null;
  bodyStyleName?: string | null;
  engineId?: string | null;
  engineName?: string | null;
  packageId?: string | null;
  packageName?: string | null;
  transmission?: string | null;
  mileage?: string | null;
  fuelType?: string | null;
  color?: string | null;
  bodyType?: string | null;
  driveType?: string | null;
  vehicleCondition?: string | null;
  hasExpertise?: boolean;
  isDamaged?: boolean;
  isTradeable?: boolean;
  expertizPanels?: Record<string, string>;
  plate?: string | null;
  eidsAccountOk?: boolean;
  eidsVehicleOk?: boolean;
  eidsMarkaAdi?: string | null;
  eidsTicariAdi?: string | null;
  eidsModelYili?: string | null;
  title?: string | null;
  description?: string | null;
  price?: string | null;
  countryId?: string | null;
  cityId?: string | null;
  district?: string | null;
  phone?: string | null;
  imagePaths?: string[];
  coverPhotoIndex?: number;
  packageIntent?: string;
  pageIndex?: number;
  /** web wizard step 1..n */
  webStep?: number;
  source?: string;
  updatedAt?: string;
};

export function draftHasProgress(d: ListingDraftPayload | null | undefined): boolean {
  if (!d) return false;
  if ((d.pageIndex ?? 0) > 0 || (d.webStep ?? 0) > 1) return true;
  if (d.categoryId) return true;
  if (d.brandId || d.modelId || d.vehicleYear) return true;
  if ((d.plate ?? "").trim()) return true;
  if ((d.title ?? "").trim()) return true;
  if ((d.imagePaths?.length ?? 0) > 0) return true;
  return false;
}

export function draftSummaryLine(d: ListingDraftPayload): string {
  const parts: string[] = [];
  if (d.categoryName?.trim()) parts.push(d.categoryName.trim());
  if (d.vehicleYear) parts.push(String(d.vehicleYear));
  if (d.brandName?.trim()) parts.push(d.brandName.trim());
  if (d.modelName?.trim()) parts.push(d.modelName.trim());
  if (parts.length === 0 && d.title?.trim()) parts.push(d.title.trim());
  return parts.length ? parts.join(" · ") : "Taslak ilan";
}

export async function fetchListingDraft(): Promise<ListingDraftPayload | null> {
  const res = await fetch("/api/listing-draft", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { draft?: ListingDraftPayload | null };
  return body.draft ?? null;
}

export async function saveListingDraft(
  draft: ListingDraftPayload
): Promise<boolean> {
  const res = await fetch("/api/listing-draft", {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ draft: { ...draft, source: "web" } }),
  });
  return res.ok;
}

export async function deleteListingDraft(): Promise<boolean> {
  const res = await fetch("/api/listing-draft", {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return res.ok;
}
