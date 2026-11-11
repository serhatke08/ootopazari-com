import type { DealerType } from "@/lib/bayi-types";

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
    label: "Galeri",
  },
  expertiz: {
    primary: "#A91414",
    primaryDark: "#7A0E0E",
    soft: "#FDECEC",
    ink: "#3B0A0A",
    logoSrc: "/menu/expertiz.png",
    label: "Ekspertiz",
  },
  kiralama: {
    primary: "#0081CC",
    primaryDark: "#005F96",
    soft: "#E8F5FC",
    ink: "#06283D",
    logoSrc: "/menu/kiralama.png",
    label: "Kiralama",
  },
  parcaci: {
    primary: "#2E6417",
    primaryDark: "#1F4610",
    soft: "#EDF6E8",
    ink: "#102508",
    logoSrc: "/menu/parca.png",
    label: "Parçacı",
  },
};

export function dealerTypeFromHref(href: string): DealerType | null {
  const path = href.split("?")[0] ?? href;
  if (path.startsWith("/bayi/galeri") || path === "/bayi/galeri") return "galeri";
  if (path.startsWith("/bayi/expertiz")) return "expertiz";
  if (path.startsWith("/bayi/kiralama") || path.startsWith("/kiralik"))
    return "kiralama";
  if (path.startsWith("/bayi/parcaci") || path === "/parca" || path.startsWith("/parca/"))
    return "parcaci";
  return null;
}

export function dealerTheme(type: DealerType): DealerTheme {
  return DEALER_THEMES[type];
}

export function parseAuthorizedBrands(raw: string | null | undefined, limit = 3): string[] {
  return String(raw ?? "")
    .split(/[,،/|]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, limit);
}
