/**
 * Motosiklet / motor seçenekleri için `public/motor` logoları.
 * Dosya adları klasördekiyle birebir aynı olmalı.
 */
export const MOTOR_LOGO_FILES = {
  aprilia: "aprilia-seeklogo.png",
  bajaj: "bajaj-seeklogo.png",
  benelli: "Benelli_(13).png",
  cfmoto: "cfmoto-logo.png",
  harley_davidson: "harley-davidson-seeklogo.png",
  honda: "honda-motor-transparent.png",
  kawasaki: "kawasaki-seeklogo.png",
} as const;

/** İkinci tercih (aynı marka için alternatif dosya) */
const MOTOR_LOGO_ALT: Partial<Record<keyof typeof MOTOR_LOGO_FILES, string>> = {
  honda: "honda-seeklogo.png",
  cfmoto: "cfmoto-seeklogo.png",
};

/** Slug → MOTOR_LOGO_FILES anahtarı */
const SLUG_TO_BRAND: Record<string, keyof typeof MOTOR_LOGO_FILES> = {
  aprilia: "aprilia",
  bajaj: "bajaj",
  benelli: "benelli",
  cfmoto: "cfmoto",
  cf_moto: "cfmoto",
  harley: "harley_davidson",
  harley_davidson: "harley_davidson",
  davidson: "harley_davidson",
  honda: "honda",
  kawasaki: "kawasaki",
};

/**
 * Uzun iğne önce (harley-davidson > harley).
 * Motosiklet markaları — DB’deki name/code/hint içinde geçerse logo seçilir.
 */
const PLAIN_KEYWORDS: {
  needle: string;
  brand: keyof typeof MOTOR_LOGO_FILES;
}[] = [
  { needle: "harley-davidson", brand: "harley_davidson" },
  { needle: "harley davidson", brand: "harley_davidson" },
  { needle: "harley", brand: "harley_davidson" },
  { needle: "davidson", brand: "harley_davidson" },
  { needle: "aprilia", brand: "aprilia" },
  { needle: "bajaj", brand: "bajaj" },
  { needle: "benelli", brand: "benelli" },
  { needle: "cf moto", brand: "cfmoto" },
  { needle: "cf-moto", brand: "cfmoto" },
  { needle: "cfmoto", brand: "cfmoto" },
  { needle: "kawasaki", brand: "kawasaki" },
  { needle: "honda", brand: "honda" },
];

const SLUG_ALIASES: Record<string, keyof typeof MOTOR_LOGO_FILES> = {
  hd: "harley_davidson",
  h_d: "harley_davidson",
  harleydavidson: "harley_davidson",
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

/** `public/motor/<dosya>` — özel karakterler için güvenli URL */
export function motorAssetUrl(filename: string): string {
  return `/motor/${filename.split("/").map(encodeURIComponent).join("/")}`;
}

function urlForBrand(brand: keyof typeof MOTOR_LOGO_FILES): string {
  const file = MOTOR_LOGO_FILES[brand];
  return motorAssetUrl(file);
}

function urlForSlug(slug: string): string | null {
  const brand = SLUG_ALIASES[slug] ?? SLUG_TO_BRAND[slug];
  if (!brand) return null;
  return urlForBrand(brand);
}

function matchPlainCombined(
  name: string,
  code: string,
  brandHint?: string
): string | null {
  const combined = `${name} ${code} ${brandHint ?? ""}`.toLowerCase().trim();
  if (!combined) return null;
  for (const { needle, brand } of PLAIN_KEYWORDS) {
    if (combined.includes(needle)) {
      return urlForBrand(brand);
    }
  }
  return null;
}

/**
 * Motor satırı adı/kodundan `public/motor` logosu.
 * `brandHint`: seçili marka adı+kodu (motosiklet markası Supabase’de böyle gelir).
 */
export function getMotorLogoUrl(
  name: string | null | undefined,
  code: string | null | undefined,
  brandHint?: string | null
): string | null {
  const n = name?.trim() ?? "";
  const c = code?.trim() ?? "";
  const hint = brandHint?.trim() ?? "";

  const plain = matchPlainCombined(n, c, hint);
  if (plain) return plain;

  const tryRaw = (raw: string | null | undefined): string | null => {
    if (!raw?.trim()) return null;
    const slug = slugify(raw);
    if (!slug) return null;
    const direct = urlForSlug(slug);
    if (direct) return direct;
    const first = slugify(raw.split(/\s+/)[0] ?? "");
    if (first) {
      const u = urlForSlug(SLUG_ALIASES[first] ?? first);
      if (u) return u;
    }
    return null;
  };

  const fromCode = tryRaw(c || undefined);
  if (fromCode) return fromCode;

  const fromName = tryRaw(n || undefined);
  if (fromName) return fromName;

  const fromHint = tryRaw(hint || undefined);
  if (fromHint) return fromHint;

  const full = slugify(`${n} ${c} ${hint}`);
  for (const slug of Object.keys(SLUG_TO_BRAND)) {
    if (full.includes(slug) || full.includes(slug.replace(/_/g, ""))) {
      const u = urlForSlug(slug);
      if (u) return u;
    }
  }

  return null;
}

/** Aynı marka için alternatif dosya URL’si (birincisi yüklenmezse UI’da kullanılabilir) */
export function getMotorLogoAltUrl(
  brand: keyof typeof MOTOR_LOGO_FILES
): string | null {
  const alt = MOTOR_LOGO_ALT[brand];
  if (!alt) return null;
  return motorAssetUrl(alt);
}

