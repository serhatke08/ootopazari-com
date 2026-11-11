import { HOME_SHORTCUTS } from "@/lib/home-shortcuts";

/** Sol menü + üst şerit — uygulama ile aynı 13 kısayol. */
export const QUICK_ACCESS_LINKS = HOME_SHORTCUTS.map((item) => ({
  href: item.href,
  label: item.label,
  image: item.image,
  glyph: item.glyph,
  fillColor: item.fillColor,
}));
