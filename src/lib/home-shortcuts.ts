import { dealerTypeLogoSrc } from "@/lib/dealer-logos";

export type HomeShortcutGlyph = "widgets";

export type HomeShortcut = {
  href: string;
  label: string;
  fillColor: string;
  image?: string;
  glyph?: HomeShortcutGlyph;
};

/** Uygulamadaki ana şerit: Kategoriler → … → Sigorta */
export const HOME_SHORTCUTS: HomeShortcut[] = [
  {
    href: "/kategoriler",
    label: "Kategoriler",
    fillColor: "#111111",
    glyph: "widgets",
  },
  {
    href: "/bayi/galeri",
    label: "Galeri",
    fillColor: "#5D17EB",
    image: dealerTypeLogoSrc("galeri"),
  },
  {
    href: "/bayi/expertiz",
    label: "Expertiz",
    fillColor: "#A91414",
    image: dealerTypeLogoSrc("expertiz"),
  },
  {
    href: "/bayi/kiralama",
    label: "Kiralama",
    fillColor: "#0097B2",
    image: dealerTypeLogoSrc("kiralama"),
  },
  {
    href: "/bayi/parcaci",
    label: "Yedek Parça",
    fillColor: "#2E6417",
    image: dealerTypeLogoSrc("parcaci"),
  },
  {
    href: "/bayi/aksesuar",
    label: "Aksesuar",
    fillColor: "#827717",
    image: dealerTypeLogoSrc("aksesuar"),
  },
  {
    href: "/bayi/servis",
    label: "Servis",
    fillColor: "#0D47A1",
    image: dealerTypeLogoSrc("servis"),
  },
  {
    href: "/bayi/kaporta",
    label: "Kaporta ve Boya",
    fillColor: "#6D4C41",
    image: dealerTypeLogoSrc("kaporta"),
  },
  {
    href: "/bayi/lastik",
    label: "Lastik",
    fillColor: "#546E7A",
    image: dealerTypeLogoSrc("lastik"),
  },
  {
    href: "/bayi/cekici",
    label: "Çekici",
    fillColor: "#FF8F00",
    image: dealerTypeLogoSrc("cekici"),
  },
  {
    href: "/bayi/oto_elektrik",
    label: "Oto Elektrik",
    fillColor: "#C2185B",
    image: dealerTypeLogoSrc("oto_elektrik"),
  },
  {
    href: "/bayi/yikama",
    label: "Yıkama",
    fillColor: "#039BE5",
    image: dealerTypeLogoSrc("yikama"),
  },
  {
    href: "/bayi/sigorta",
    label: "Sigorta",
    fillColor: "#1B5E20",
    image: dealerTypeLogoSrc("sigorta"),
  },
];

export function homeShortcutFromHref(href: string): HomeShortcut | null {
  const path = href.split("?")[0] ?? href;
  return (
    HOME_SHORTCUTS.find(
      (item) => path === item.href || path.startsWith(`${item.href}/`)
    ) ?? null
  );
}
