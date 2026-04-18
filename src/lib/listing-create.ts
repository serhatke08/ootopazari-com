import type { ExpertizDurum } from "@/lib/expertiz";
import type { PanelKey } from "@/lib/expertiz";

/** Araç kolonları yalnızca bu `categories.code` değerlerinde doldurulur. */
export const VEHICLE_CATEGORY_CODES = new Set([
  "otomobil",
  "suv_pickup",
  "motosiklet",
  "panelvan",
  "klasik",
  "deniz",
  "hasarli",
  "karavan",
  "hava",
  "atv",
  "utv",
]);

export function isVehicleCategoryCode(code: string | null | undefined): boolean {
  if (code == null || String(code).trim() === "") return false;
  return VEHICLE_CATEGORY_CODES.has(String(code).trim().toLowerCase());
}

const RE_SCRIPT = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;

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
    if (RE_SCRIPT.test(t) || RE_SCRIPT.test(d)) {
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
};

function fmtBool(v: boolean | null | undefined): string {
  if (v === true) return "Evet";
  if (v === false) return "Hayır";
  return "—";
}

/**
 * Kullanıcı metni + özet satırlar; sonunda Araç Durumu / Garanti / Plaka blokları (araçta).
 */
export function composeListingDescription(
  input: ComposeDescriptionInput
): string {
  const parts: string[] = [];
  const u = input.userDescription.trim();
  if (u) parts.push(u);

  const line = (label: string, val: string | null | undefined) => {
    const v = val?.trim();
    if (v) parts.push(`${label}: ${v}`);
  };

  if (input.isVehicle) {
    line("Marka", input.otherBrandNote);
    line("Seri/Model", input.seriModelNote);
    line("Kasa Tipi", input.kasaTipiNote);
    line("Motor", input.motorNote);
    line("Paket", input.paketNote);
    const yvt = [
      input.fuelType?.trim() && `Yakıt: ${input.fuelType.trim()}`,
      input.transmissionType?.trim() && `Vites: ${input.transmissionType.trim()}`,
      input.driveType?.trim() && `Çekiş: ${input.driveType.trim()}`,
    ].filter(Boolean);
    if (yvt.length) parts.push(yvt.join(" · "));
    line("Araç durumu", input.vehicleCondition);
    if (input.warranty !== null && input.warranty !== undefined) {
      parts.push(`Garanti: ${fmtBool(input.warranty)}`);
    }
    if (
      input.heavyDamageRecorded !== null &&
      input.heavyDamageRecorded !== undefined
    ) {
      parts.push(
        `Ağır hasar kayıtlı: ${fmtBool(input.heavyDamageRecorded)}`
      );
    }
    line("Plaka", input.plakaUyruk);
    parts.push("");
    parts.push(`Araç Durumu: ${input.vehicleCondition?.trim() || "—"}`);
    parts.push(`Garanti: ${fmtBool(input.warranty ?? null)}`);
    parts.push(`Plaka: ${input.plakaUyruk?.trim() || "—"}`);
  }

  return parts.join("\n").trim();
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
    if (v == null || v === "" || v === "orijinal") continue;
    out[k] = DURUM_TO_DB[v as ExpertizDurum] ?? String(v);
  }
  return Object.keys(out).length ? out : null;
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
