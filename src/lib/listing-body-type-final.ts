/**
 * İlan Ver 3. adım sabit kasa listesi (Supabase’den çekilmez).
 * Flutter `listing_detail` / create listing ile uyumlu etiketler.
 */
export const STEP3_BODY_FIXED_LABELS = [
  "Sedan",
  "Hatchback",
  "SUV",
  "Station Wagon",
  "Coupe",
  "Cabrio",
  "Pickup",
  "Van",
  "Diğer",
] as const;

/** Boş = 1. adımdaki kasa (vehicle_model_body_styles veya Diğer metin). */
export const STEP3_BODY_USE_STEP1 = "";

/** Serbest metin — “Diğer (Yaz)”. */
export const STEP3_BODY_YAZ = "__yaz__";

export function computeListingBodyTypeFinal(input: {
  /** STEP3_BODY_USE_STEP1 | sabit etiket | STEP3_BODY_YAZ */
  step3Choice: string;
  step3YazText: string;
  step1StyleName: string | null;
  step1OtherBodyText: string;
}): string | null {
  const c = input.step3Choice;
  if (c === STEP3_BODY_YAZ) {
    const t = input.step3YazText.trim();
    return t || null;
  }
  if (c && c !== STEP3_BODY_USE_STEP1) {
    return c.trim();
  }
  const o = input.step1OtherBodyText.trim();
  if (o) return o;
  const n = input.step1StyleName?.trim();
  return n || null;
}
