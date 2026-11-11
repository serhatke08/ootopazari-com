export type HomeShortcutGlyph =
  | "widgets"
  | "aksesuar"
  | "servis"
  | "kaporta"
  | "lastik"
  | "cekici"
  | "oto_elektrik"
  | "yikama"
  | "sigorta";

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
    image: "/menu/galeri.png",
  },
  {
    href: "/bayi/expertiz",
    label: "Expertiz",
    fillColor: "#A91414",
    image: "/menu/expertiz.png",
  },
  {
    href: "/bayi/kiralama",
    label: "Kiralama",
    fillColor: "#0081CC",
    image: "/menu/kiralama.png",
  },
  {
    href: "/bayi/parcaci",
    label: "Yedek Parça",
    fillColor: "#2E6417",
    image: "/menu/parca.png",
  },
  {
    href: "/bayi/aksesuar",
    label: "Aksesuar",
    fillColor: "#827717",
    glyph: "aksesuar",
  },
  {
    href: "/bayi/servis",
    label: "Servis",
    fillColor: "#0D47A1",
    glyph: "servis",
  },
  {
    href: "/bayi/kaporta",
    label: "Kaporta ve Boya",
    fillColor: "#6D4C41",
    glyph: "kaporta",
  },
  {
    href: "/bayi/lastik",
    label: "Lastik",
    fillColor: "#546E7A",
    glyph: "lastik",
  },
  {
    href: "/bayi/cekici",
    label: "Çekici",
    fillColor: "#FF8F00",
    glyph: "cekici",
  },
  {
    href: "/bayi/oto_elektrik",
    label: "Oto Elektrik",
    fillColor: "#C2185B",
    glyph: "oto_elektrik",
  },
  {
    href: "/bayi/yikama",
    label: "Yıkama",
    fillColor: "#039BE5",
    glyph: "yikama",
  },
  {
    href: "/bayi/sigorta",
    label: "Sigorta",
    fillColor: "#1B5E20",
    glyph: "sigorta",
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
