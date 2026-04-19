function turkishToAscii(input: string): string {
  return input
    .replace(/Ç/g, "c")
    .replace(/ç/g, "c")
    .replace(/Ğ/g, "g")
    .replace(/ğ/g, "g")
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .replace(/Ö/g, "o")
    .replace(/ö/g, "o")
    .replace(/Ş/g, "s")
    .replace(/ş/g, "s")
    .replace(/Ü/g, "u")
    .replace(/ü/g, "u");
}

export function slugifyListingTitle(title: string | null | undefined): string {
  const raw = turkishToAscii(String(title ?? "").trim().toLocaleLowerCase("tr"));
  const normalized = raw.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const slug = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
  return slug || "ilan";
}

export function buildListingSeoPath(
  listingNumber: string | number | null | undefined,
  title: string | null | undefined
): string | null {
  if (listingNumber == null) return null;
  const n = String(listingNumber).trim();
  if (!n) return null;
  const slug = slugifyListingTitle(title);
  return `/ilan/${encodeURIComponent(n)}-${slug}`;
}

/** `/ilan/12300024-250-nk-temiz` -> `12300024` */
export function extractListingNumberFromSeoParam(
  param: string | null | undefined
): string | null {
  const raw = String(param ?? "").trim();
  if (!raw) return null;
  const m = /^(\d{3,})/.exec(raw);
  return m ? m[1] : null;
}
