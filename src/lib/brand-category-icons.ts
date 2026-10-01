/** Marka kodu → `/public/car_brands/` dosya adı (uzantılı). */
const BRAND_LOGO_FILE: Record<string, string> = {
  alfa_romeo: "alfa_romeo.png",
  byd: "byd.png",
  abarth: "abarth-seeklogo.png",
  bmw: "bmw.svg", // svg varsa onu kullan; yoksa png
  daihatsu: "daihatsu.png",
  ferrari: "ferrari-seeklogo.png",
  land_rover: "land_rover-seeklogo.png",
  lotus: "lotus-seeklogo.png",
  mercedes_benz: "mercedes_benz.svg",
  opel: "opel.svg",
  peugeot: "peugeot.svg",
  porsche: "porsche.svg",
};

/**
 * İlan ver / marka satırı için logo URL.
 * Önce özel map, yoksa `code.svg`.
 */
export function brandLogoSrc(code: string | null | undefined): string | null {
  const c = (code ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (!c) return null;
  const mapped = BRAND_LOGO_FILE[c];
  if (mapped) return `/car_brands/${mapped}`;
  return `/car_brands/${c}.svg`;
}

/** Kategori kodu → `/public/categories/` ikon */
export function categoryIconSrc(code: string | null | undefined): string {
  const c = (code ?? "").trim().toLowerCase();
  switch (c) {
    case "otomobil":
      return "/categories/otomobil.png";
    case "suv_pickup":
    case "elektrikli":
      return "/categories/suv_pickup.png";
    case "motosiklet":
      return "/categories/motosiklet.png";
    case "scooter_bisiklet":
      return "/categories/scooter_bisiklet.png";
    case "is_ve_tarim_makinesi":
      return "/categories/is_makinesi.png";
    case "atv_utv":
      return "/categories/atv_utv.png";
    case "panelvan":
      return "/categories/panelvan.png";
    case "klasik":
      return "/categories/klasik.png";
    case "deniz":
      return "/categories/deniz.png";
    case "hasarli":
      return "/categories/hasarli.png";
    case "karavan":
      return "/categories/karavan.png";
    case "hava":
      return "/categories/hava.png";
    default:
      return "/categories/otomobil.png";
  }
}
