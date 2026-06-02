/** Sol menü kategori ikonları — `public/menu/kategori icon/{n}.png` */
export function categoryIconUrl(order: number): string {
  return `/menu/${encodeURIComponent("kategori icon")}/${order}.png`;
}

/** Eksik ikon dosyalarında yedek (genel araç). */
export function categoryIconFallbackUrl(): string {
  return `/menu/${encodeURIComponent("kategori icon")}/pngwing.com.png`;
}
