import { DEALER_TYPES, DEALER_TYPE_LABELS, type DealerType } from "@/lib/bayi-types";
import { homeShortcutFromHref } from "@/lib/home-shortcuts";

export type DealerTheme = {
  primary: string;
  primaryDark: string;
  soft: string;
  ink: string;
  logoSrc: string;
  label: string;
};

export const DEALER_THEMES: Record<DealerType, DealerTheme> = {
  galeri: {
    primary: "#5D17EB",
    primaryDark: "#3F0FA8",
    soft: "#F3ECFF",
    ink: "#1A0B3D",
    logoSrc: "/menu/galeri.png",
    label: DEALER_TYPE_LABELS.galeri,
  },
  expertiz: {
    primary: "#A91414",
    primaryDark: "#7A0E0E",
    soft: "#FDECEC",
    ink: "#3B0A0A",
    logoSrc: "/menu/expertiz.png",
    label: DEALER_TYPE_LABELS.expertiz,
  },
  kiralama: {
    primary: "#0081CC",
    primaryDark: "#005F96",
    soft: "#E8F5FC",
    ink: "#06283D",
    logoSrc: "/menu/kiralama.png",
    label: DEALER_TYPE_LABELS.kiralama,
  },
  parcaci: {
    primary: "#2E6417",
    primaryDark: "#1F4610",
    soft: "#EDF6E8",
    ink: "#102508",
    logoSrc: "/menu/parca.png",
    label: DEALER_TYPE_LABELS.parcaci,
  },
  aksesuar: {
    primary: "#827717",
    primaryDark: "#5E560F",
    soft: "#F4F6E8",
    ink: "#2A2808",
    logoSrc: "",
    label: DEALER_TYPE_LABELS.aksesuar,
  },
  servis: {
    primary: "#0D47A1",
    primaryDark: "#093270",
    soft: "#E8F0FA",
    ink: "#051A3A",
    logoSrc: "",
    label: DEALER_TYPE_LABELS.servis,
  },
  kaporta: {
    primary: "#6D4C41",
    primaryDark: "#4E352D",
    soft: "#F3EEEB",
    ink: "#2A1C18",
    logoSrc: "",
    label: DEALER_TYPE_LABELS.kaporta,
  },
  lastik: {
    primary: "#546E7A",
    primaryDark: "#3B4D56",
    soft: "#EEF2F4",
    ink: "#1C262A",
    logoSrc: "",
    label: DEALER_TYPE_LABELS.lastik,
  },
  cekici: {
    primary: "#FF8F00",
    primaryDark: "#C66E00",
    soft: "#FFF4E0",
    ink: "#4A2A00",
    logoSrc: "",
    label: DEALER_TYPE_LABELS.cekici,
  },
  oto_elektrik: {
    primary: "#C2185B",
    primaryDark: "#8C1142",
    soft: "#FCE8F0",
    ink: "#3A071B",
    logoSrc: "",
    label: DEALER_TYPE_LABELS.oto_elektrik,
  },
  yikama: {
    primary: "#039BE5",
    primaryDark: "#0277B0",
    soft: "#E6F6FD",
    ink: "#01364F",
    logoSrc: "",
    label: DEALER_TYPE_LABELS.yikama,
  },
  sigorta: {
    primary: "#1B5E20",
    primaryDark: "#123F16",
    soft: "#E8F5E9",
    ink: "#08240A",
    logoSrc: "",
    label: DEALER_TYPE_LABELS.sigorta,
  },
};

export function dealerTypeFromHref(href: string): DealerType | null {
  const path = href.split("?")[0] ?? href;
  const match = path.match(/^\/bayi\/([^/]+)/);
  if (match?.[1] && DEALER_TYPES.includes(match[1] as DealerType)) {
    return match[1] as DealerType;
  }
  if (path.startsWith("/kiralik")) return "kiralama";
  if (path === "/parca" || path.startsWith("/parca/")) return "parcaci";
  return null;
}

export function dealerTheme(type: DealerType): DealerTheme {
  return DEALER_THEMES[type];
}

export function circleFillFromHref(href: string): string | null {
  return homeShortcutFromHref(href)?.fillColor ?? null;
}

export function parseAuthorizedBrands(raw: string | null | undefined, limit = 3): string[] {
  return String(raw ?? "")
    .split(/[,،/|]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, limit);
}
