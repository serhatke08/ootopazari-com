import type { ExpertizDurum } from "@/lib/expertiz";
import { PANEL_KEYS, type PanelKey } from "@/lib/expertiz";

/** Araç kolonları yalnızca bu `categories.code` değerlerinde doldurulur. */
export const VEHICLE_CATEGORY_CODES = new Set([
  "otomobil",
  "suv_pickup",
  "motosiklet",
  "elektrikli",
  "panelvan",
  "is_ve_tarim_makinesi",
  "scooter_bisiklet",
  "klasik",
  "deniz",
  "hasarli",
  "karavan",
  "hava",
  "atv",
  "utv",
  "atv_utv",
]);

export function isVehicleCategoryCode(code: string | null | undefined): boolean {
  if (code == null || String(code).trim() === "") return false;
  return VEHICLE_CATEGORY_CODES.has(String(code).trim().toLowerCase());
}

/** Kaporta ekspertiz şeması: otomobil / SUV / panelvan. Motor, uçak, gemi yok. */
const BODY_EXPERTIZ_CODES = new Set([
  "otomobil",
  "car",
  "binek",
  "suv",
  "suv_pickup",
  "panelvan",
  "panel_van",
]);

const BODY_EXPERTIZ_NAME_RE =
  /otomobil|\baraba\b|binek|\bsuv\b|panel\s*van|panelvan|hafif\s*ticari/;

const BODY_EXPERTIZ_BLOCK_RE =
  /motosiklet|motorcycle|\bmoto\b|scooter|deniz|gemi|yat|tekne|hava|u[cç]ak|helikopter|atv|utv|karavan|tar[iı]m/;

export function categoryAllowsBodyExpertiz(
  code?: string | null,
  name?: string | null
): boolean {
  const c = String(code ?? "")
    .trim()
    .toLocaleLowerCase("tr");
  const n = String(name ?? "")
    .trim()
    .toLocaleLowerCase("tr");
  if (BODY_EXPERTIZ_BLOCK_RE.test(c) || BODY_EXPERTIZ_BLOCK_RE.test(n)) {
    return false;
  }
  if (c && BODY_EXPERTIZ_CODES.has(c)) return true;
  return BODY_EXPERTIZ_NAME_RE.test(c) || BODY_EXPERTIZ_NAME_RE.test(n);
}

const RE_UNSAFE_HTML =
  /<script[\s\S]*?>|javascript\s*:|onerror\s*=|onload\s*=/i;

export const ContentFilterService = {
  validateListingContent(title: string, description: string): {
    ok: boolean;
    message?: string;
  } {
    const t = title.trim();
    const d = description;
    if (t.length > 500) {
      return { ok: false, message: "Başlık en fazla 500 karakter olabilir." };
    }
    if (d.length > 50_000) {
      return { ok: false, message: "Açıklama çok uzun." };
    }
    if (RE_UNSAFE_HTML.test(t) || RE_UNSAFE_HTML.test(d)) {
      return { ok: false, message: "İçerik güvenlik kontrolünden geçmedi." };
    }
    return { ok: true };
  },
};

/** Tam sayı fiyat girişi: rakamlar dışını atar, sağdan 3’er gruba böler (örn. 1.234.567). */
export function formatPriceThousandsTr(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Kilometre: fiyat ile aynı binlik nokta ayracı. */
export const formatMileageThousandsTr = formatPriceThousandsTr;

export function parsePriceTry(s: string): number | null {
  let t = s.replace(/\s/g, "").replace(/[^\d.,]/g, "");
  if (!t) return null;
  const hasComma = t.includes(",");
  const hasDot = t.includes(".");
  if (hasComma && !hasDot) {
    t = t.replace(",", ".");
  } else if (!hasComma && hasDot) {
    const parts = t.split(".");
    if (parts.length === 2 && parts[1].length <= 2) {
      /* ondalık: 19999.99 */
    } else {
      t = t.replace(/\./g, "");
    }
  } else if (hasComma && hasDot) {
    t = t.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseMileageTry(s: string): number | null {
  const x = s.replace(/\./g, "").replace(/\s/g, "").replace(/[^\d]/g, "");
  if (!x) return null;
  const n = Number(x);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** 10 hane, 5 ile başlar → true */
export function isValidTrMobile10(digits: string): boolean {
  return /^\d{10}$/.test(digits) && digits.startsWith("5");
}

export function normalizePhoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

export function formatContactPhone(digits10: string): string {
  return `0${digits10}`;
}

export type ComposeDescriptionInput = {
  userDescription: string;
  isVehicle: boolean;
  /** Diğer marka — description’a Marka: satırı */
  otherBrandNote?: string | null;
  seriModelNote?: string | null;
  kasaTipiNote?: string | null;
  motorNote?: string | null;
  paketNote?: string | null;
  fuelType?: string | null;
  transmissionType?: string | null;
  driveType?: string | null;
  vehicleCondition?: string | null;
  warranty?: boolean | null;
  heavyDamageRecorded?: boolean | null;
  plakaUyruk?: string | null;
  /** Motosiklet: Seri/Paket yerine Model + CC satırları */
  isMotorcycle?: boolean;
};

/**
 * Kullanıcı açıklaması. Araç özet satırları (garanti vb.) artık açıklamaya
 * yapıştırılmaz — yapısal alanlarda / detay şemasında tutulur.
 */
export function composeListingDescription(
  input: ComposeDescriptionInput
): string {
  return input.userDescription.trim();
}

/** `vehicle_model` metni: özel seri modunda yalnızca kullanıcı metni; değilse model+motor+paket. */
export function buildVehicleModelText(opts: {
  customModelMode: boolean;
  customModelText: string;
  modelName: string | null;
  engineName: string | null;
  packageName: string | null;
}): string {
  if (opts.customModelMode) {
    return opts.customModelText.trim();
  }
  return [opts.modelName, opts.engineName, opts.packageName]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(" ");
}

const DURUM_TO_DB: Record<ExpertizDurum, string> = {
  orijinal: "original",
  boyalı: "painted",
  lokal_boyalı: "local_painted",
  değişen: "replaced",
};

export function expertizPanelsToJson(
  panels: Partial<Record<PanelKey, ExpertizDurum | "">>
): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(panels)) {
    if (v == null || v === "") continue;
    out[k] = DURUM_TO_DB[v as ExpertizDurum] ?? String(v);
  }
  // Hiç seçim yoksa tüm panelleri orijinal yaz — detayda şema görünsün
  if (Object.keys(out).length === 0) {
    for (const k of PANEL_KEYS) {
      out[k] = DURUM_TO_DB.orijinal;
    }
  }
  return out;
}

export const REQUIRES_APPROVAL_REVIEW = false;

export function moderationPayload(): {
  moderation_status: string;
  moderation_reason: null;
} {
  return REQUIRES_APPROVAL_REVIEW
    ? { moderation_status: "pending", moderation_reason: null }
    : { moderation_status: "approved", moderation_reason: null };
}

const LISTING_CLIENT_WRITE_KEYS = new Set([
  "category_id",
  "title",
  "description",
  "price",
  "is_fixed_price",
  "is_negotiable",
  "city_id",
  "district",
  "contact_phone",
  "country_id",
  "vehicle_brand_id",
  "vehicle_model",
  "vehicle_year",
  "vehicle_mileage",
  "fuel_type",
  "transmission_type",
  "engine_capacity",
  "engine_power",
  "color",
  "body_type",
  "drive_type",
  "vehicle_brand_model_id",
  "vehicle_engine_package_id",
  "has_expertise",
  "is_damaged",
  "is_tradeable",
  "expertiz_panels",
  "image_url",
  "images",
  "contact_via_phone",
  "contact_via_message",
]);

const LISTING_CLIENT_INSERT_ONLY_KEYS = new Set([
  "user_id",
  "activated_at",
  "activation_status",
  "activation_fee_amount",
  "moderation_status",
  "moderation_reason",
  "created_client",
]);

/** Türkiye mağaza — ilan satırında ülke her zaman TR. */
export const TURKEY_COUNTRY_ID = "00000000-0000-0000-0000-000000000001";

/** Tarayıcıdan gelen ilan yazımında öne çıkar / askı / sahte user_id yok. */
export function sanitizeListingClientWrite(
  raw: Record<string, unknown>,
  mode: "insert" | "update",
  options?: { qualityResubmitPending?: boolean }
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (LISTING_CLIENT_WRITE_KEYS.has(key)) {
      out[key] = value;
      continue;
    }
    if (mode === "insert" && LISTING_CLIENT_INSERT_ONLY_KEYS.has(key)) {
      out[key] = value;
    }
  }
  if (mode === "update" && options?.qualityResubmitPending) {
    out.moderation_status = "pending";
  }
  out.country_id = TURKEY_COUNTRY_ID;
  return out;
}
