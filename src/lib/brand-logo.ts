/** `public/car_brands` içindeki vektör logolar (.svg) */
const SVG_SLUGS = new Set([
  "acura",
  "aston_martin",
  "audi",
  "bentley",
  "bmw",
  "bugatti",
  "buick",
  "cadillac",
  "chery",
  "chevrolet",
  "chrysler",
  "citroen",
  "cupra",
  "dacia",
  "dodge",
  "ds_automobiles",
  "ferrari",
  "fiat",
  "ford",
  "geely",
  "genesis",
  "gmc",
  "honda",
  "hummer",
  "hyundai",
  "infiniti",
  "jaguar",
  "jeep",
  "kia",
  "koenigsegg",
  "lamborghini",
  "lexus",
  "lincoln",
  "lotus",
  "maserati",
  "mazda",
  "mclaren",
  "mercedes_benz",
  "mg",
  "mini",
  "mitsubishi",
  "nissan",
  "opel",
  "porsche",
  "renault",
  "rolls_royce",
  "seat",
  "skoda",
  "smart",
  "subaru",
  "suzuki",
  "tesla",
  "tofas",
  "toyota",
  "volkswagen",
  "volvo",
]);

/** .svg dışı dosyalar (slug → dosya adı) */
const EXTRA_FILES: Record<string, string> = {
  peugeot: "peugeot-seeklogo.png",
  alfa_romeo: "alfa-romeo-seeklogo.png",
  abarth: "abarth.jpg",
  byd: "byd-new.png",
  daihatsu: "daihatsu.png",
  land_rover: "land_rover.jpg",
};

/** DB / kullanıcı yazımı → klasördeki slug */
const SLUG_ALIASES: Record<string, string> = {
  mercedes: "mercedes_benz",
  mercedesbenz: "mercedes_benz",
  vw: "volkswagen",
  v_w: "volkswagen",
  landrover: "land_rover",
  range_rover: "land_rover",
  rangerover: "land_rover",
  alfa: "alfa_romeo",
  ds: "ds_automobiles",
  mini_cooper: "mini",
  mini: "mini",
};

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[-\s]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function resolveSlug(raw: string): string | null {
  const s = slugify(raw);
  if (!s) return null;
  return SLUG_ALIASES[s] ?? s;
}

function urlForSlug(slug: string): string | null {
  if (SVG_SLUGS.has(slug)) return `/car_brands/${slug}.svg`;
  const extra = EXTRA_FILES[slug];
  if (extra) return `/car_brands/${extra}`;
  return null;
}

/**
 * Marka adı veya kodundan `public/car_brands` altındaki logo URL’si.
 * Eşleşmezse `null` (yalnızca metin gösterilir).
 */
export function getBrandLogoUrl(
  name: string | null | undefined,
  code: string | null | undefined
): string | null {
  const tryRaw = (raw: string | null | undefined): string | null => {
    if (!raw?.trim()) return null;
    const slug = resolveSlug(raw);
    if (!slug) return null;
    const direct = urlForSlug(slug);
    if (direct) return direct;
    const compact = slug.replace(/_/g, "");
    const alias = SLUG_ALIASES[compact] ?? compact;
    return urlForSlug(alias);
  };

  const fromCode = tryRaw(code ?? undefined);
  if (fromCode) return fromCode;

  const fromName = tryRaw(name ?? undefined);
  if (fromName) return fromName;

  if (name?.trim()) {
    const first = slugify(name.split(/\s+/)[0] ?? "");
    if (first) {
      const u = urlForSlug(SLUG_ALIASES[first] ?? first);
      if (u) return u;
    }
    const full = slugify(name);
    for (const slug of SVG_SLUGS) {
      if (full.includes(slug) || full.includes(slug.replace(/_/g, ""))) {
        const u = urlForSlug(slug);
        if (u) return u;
      }
    }
  }

  return null;
}
