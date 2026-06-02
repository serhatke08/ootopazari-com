/** Sol menü kategori ikonları — `public/menu/kategori icon/{n}.png` */
const CATEGORY_ICON_BY_CODE: Record<string, number> = {
  otomobil: 1,
  suv_pickup: 2,
  motosiklet: 3,
  scooter_bisiklet: 4,
  is_ve_tarim_makinesi: 5,
  panelvan: 6,
  klasik: 7,
  deniz: 8,
  hasarli: 9,
  karavan: 10,
  hava: 11,
  atv_utv: 12,
};

export function categoryIconUrl(order: number): string {
  return `/menu/${encodeURIComponent("kategori icon")}/${order}.png`;
}

export function categoryIconUrlForCategory(
  code: string | null | undefined,
  fallbackOrder: number
): string {
  const key = code?.trim().toLocaleLowerCase("tr") ?? "";
  const order = CATEGORY_ICON_BY_CODE[key] ?? fallbackOrder;
  return categoryIconUrl(order);
}

/** Eksik ikon dosyalarında yedek (genel araç). */
export function categoryIconFallbackUrl(): string {
  return categoryIconUrl(1);
}
