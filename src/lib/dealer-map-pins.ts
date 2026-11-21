function workplacePaths(raw: unknown): string[] {
  if (raw == null || raw === "") return [];
  let value: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        value = JSON.parse(trimmed);
      } catch {
        return [trimmed];
      }
    } else {
      return [trimmed];
    }
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => workplacePaths(item));
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

export type DealerMapPin = {
  id: string;
  user_id: string | null;
  dealer_type: string;
  dealer_name: string;
  contact_phone: string | null;
  description: string | null;
  full_address: string | null;
  latitude: number;
  longitude: number;
  city_name: string | null;
  working_hours: string | null;
  authorized_brands: string | null;
  whatsapp_phone: string | null;
  workplace_photos_json: unknown;
  signboard_photo_storage_path: string | null;
  first_name: string | null;
  last_name: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
};

/** Pin içi: yalnız tabela. */
export function firstMapPinPhotoPath(pin: DealerMapPin): string | null {
  const sign = pin.signboard_photo_storage_path?.trim();
  return sign || null;
}

/** Popup kapak: yalnız yatay dükkan fotoğrafı. */
export function firstMapPinCoverPath(pin: DealerMapPin): string | null {
  return workplacePaths(pin.workplace_photos_json)[0] || null;
}

export function toDealerMapPin(row: Record<string, unknown>): DealerMapPin | null {
  const lat = typeof row.latitude === "number" ? row.latitude : Number(row.latitude);
  const lng =
    typeof row.longitude === "number" ? row.longitude : Number(row.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const id = String(row.id ?? "");
  if (!id) return null;
  return {
    id,
    user_id: row.user_id ? String(row.user_id) : null,
    dealer_type: String(row.dealer_type ?? ""),
    dealer_name: String(row.dealer_name ?? ""),
    contact_phone: row.contact_phone ? String(row.contact_phone) : null,
    description: row.description ? String(row.description) : null,
    full_address: row.full_address ? String(row.full_address) : null,
    latitude: lat,
    longitude: lng,
    city_name: row.city_name ? String(row.city_name) : null,
    working_hours: row.working_hours ? String(row.working_hours) : null,
    authorized_brands: row.authorized_brands
      ? String(row.authorized_brands)
      : null,
    whatsapp_phone: row.whatsapp_phone ? String(row.whatsapp_phone) : null,
    workplace_photos_json: row.workplace_photos_json ?? [],
    signboard_photo_storage_path: row.signboard_photo_storage_path
      ? String(row.signboard_photo_storage_path)
      : null,
    first_name: row.first_name ? String(row.first_name) : null,
    last_name: row.last_name ? String(row.last_name) : null,
  };
}

export async function fetchDealerMapPins(): Promise<DealerMapPin[]> {
  const res = await fetch("/api/dealer-map-pins", { cache: "no-store" });
  if (!res.ok) throw new Error("dealer map pins");
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];
  const out: DealerMapPin[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const pin = toDealerMapPin(row as Record<string, unknown>);
    if (!pin) continue;
    const rec = row as Record<string, unknown>;
    pin.logoUrl = rec.logoUrl ? String(rec.logoUrl) : null;
    pin.coverUrl = rec.coverUrl ? String(rec.coverUrl) : null;
    out.push(pin);
  }
  return out;
}
