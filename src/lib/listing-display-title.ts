/**
 * Uygulama `listingDisplayTitle` ile aynı:
 * marka başlıkta yoksa `Marka · başlık`.
 */
export function listingDisplayTitle(opts: {
  title?: string | null;
  brandName?: string | null;
  vehicleModel?: string | null;
  vehicleSeries?: string | null;
}): string {
  const explicitTitle = (opts.title ?? "").trim();
  const normalized = explicitTitle.toLocaleLowerCase("tr");
  const isPlaceholder =
    !explicitTitle ||
    normalized === "ilan" ||
    normalized === "i̇lan" ||
    normalized === "bir ilan" ||
    normalized === "bir i̇lan" ||
    normalized === "listing" ||
    normalized === "a listing" ||
    normalized === "başlıksız ilan";

  const brand = (opts.brandName ?? "").trim();
  const model = (opts.vehicleModel ?? "").trim();
  const series = (opts.vehicleSeries ?? "").trim();

  if (!isPlaceholder) {
    if (
      brand &&
      !explicitTitle.toLocaleLowerCase("tr").includes(brand.toLocaleLowerCase("tr"))
    ) {
      return `${brand} · ${explicitTitle}`;
    }
    return explicitTitle;
  }

  if (brand && model) return `${brand} ${model}`;
  if (brand && series) return `${brand} ${series}`;
  if (brand) return brand;
  if (model) return model;
  if (series) return series;
  return "İlan";
}
