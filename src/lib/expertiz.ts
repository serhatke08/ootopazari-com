/** Ekspertiz panel durumları (Supabase / mobil ile uyumlu çeşitli yazımlar) */
export type ExpertizDurum =
  | "orijinal"
  | "boyalı"
  | "lokal_boyalı"
  | "değişen";

const STATE_ALIASES: Record<string, ExpertizDurum> = {
  orijinal: "orijinal",
  original: "orijinal",
  boyalı: "boyalı",
  boyali: "boyalı",
  boya: "boyalı",
  painted: "boyalı",
  "lokal boyalı": "lokal_boyalı",
  lokal_boyalı: "lokal_boyalı",
  lokalboyali: "lokal_boyalı",
  lokal: "lokal_boyalı",
  "local painted": "lokal_boyalı",
  local_painted: "lokal_boyalı",
  değişen: "değişen",
  degisen: "değişen",
  degis: "değişen",
  replaced: "değişen",
};

export function normalizeExpertizDurum(raw: string): ExpertizDurum | null {
  const k = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (STATE_ALIASES[k]) return STATE_ALIASES[k];
  const compact = k.replace(/[^a-z0-9ğüşıöç]/gi, "");
  for (const [a, v] of Object.entries(STATE_ALIASES)) {
    if (a.replace(/[^a-z0-9ğüşıöç]/gi, "") === compact) return v;
  }
  return null;
}

/**
 * Şablon görseli 500×500; üç görünüm yan yana. Yüzde değerler tam görsele göre.
 */
export const PANEL_REGIONS = {
  kaput: { left: 38, top: 10, width: 24, height: 16 },
  tavan: { left: 40, top: 30, width: 20, height: 20 },
  bagaj: { left: 38, top: 74, width: 24, height: 14 },
  sol_on_camurluk: { left: 6, top: 36, width: 22, height: 11 },
  sol_on_kapi: { left: 7, top: 47, width: 18, height: 13 },
  sol_arka_kapi: { left: 7, top: 60, width: 18, height: 13 },
  sol_arka_camurluk: { left: 6, top: 72, width: 22, height: 11 },
  sag_on_camurluk: { left: 72, top: 36, width: 22, height: 11 },
  sag_on_kapi: { left: 75, top: 47, width: 18, height: 13 },
  sag_arka_kapi: { left: 75, top: 60, width: 18, height: 13 },
  sag_arka_camurluk: { left: 72, top: 72, width: 22, height: 11 },
  on_tampon: { left: 40, top: 4, width: 20, height: 8 },
  arka_tampon: { left: 40, top: 88, width: 20, height: 8 },
} as const;

export type PanelKey = keyof typeof PANEL_REGIONS;

/** Panel anahtarlarını şemadaki bölgelere eşler (küçük harf, alt çizgi) */
const PANEL_ALIASES: Record<string, PanelKey> = {
  kaput: "kaput",
  hood: "kaput",
  tavan: "tavan",
  roof: "tavan",
  bagaj: "bagaj",
  bagaj_kapagi: "bagaj",
  trunk: "bagaj",
  sol_on_camurluk: "sol_on_camurluk",
  on_sol_camurluk: "sol_on_camurluk",
  sag_on_camurluk: "sag_on_camurluk",
  on_sag_camurluk: "sag_on_camurluk",
  sol_on_kapi: "sol_on_kapi",
  sag_on_kapi: "sag_on_kapi",
  sol_arka_kapi: "sol_arka_kapi",
  sag_arka_kapi: "sag_arka_kapi",
  sol_arka_camurluk: "sol_arka_camurluk",
  sag_arka_camurluk: "sag_arka_camurluk",
  on_tampon: "on_tampon",
  arka_tampon: "arka_tampon",
};

function normalizePanelKey(key: string): PanelKey | null {
  const k = key
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_|_$/g, "");
  if (k in PANEL_REGIONS) return k as PanelKey;
  if (PANEL_ALIASES[k]) return PANEL_ALIASES[k];
  return null;
}

export function parseExpertizPanels(
  raw: unknown
): Record<string, ExpertizDurum> | null {
  if (raw == null) return null;
  let v: unknown = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v) as unknown;
    } catch {
      return null;
    }
  }
  const out: Record<string, ExpertizDurum> = {};

  if (Array.isArray(v)) {
    for (const item of v) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const pk =
        o.panel ?? o.part ?? o.parca ?? o.name ?? o.key ?? o.slug ?? o.id;
      const st = o.state ?? o.durum ?? o.status ?? o.type;
      if (pk == null || st == null) continue;
      const nk = normalizePanelKey(String(pk));
      const ns = normalizeExpertizDurum(String(st));
      if (nk && ns) out[nk] = ns;
    }
  } else if (typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val == null || val === "") continue;
      const nk = normalizePanelKey(k);
      const ns = normalizeExpertizDurum(String(val));
      if (nk && ns) out[nk] = ns;
    }
  }

  return Object.keys(out).length ? out : null;
}

/** `public/car_brands/...` altındaki klasör (şablon + parça PNG’leri) */
export const EXPERTIZ_ASSET_DIR = "Adsız tasarım (6)";

/** Tarayıcıda güvenli URL (Türkçe / boşluk için segment bazlı encode) */
export function expertizAssetUrl(filename: string): string {
  return (
    "/" +
    ["car_brands", EXPERTIZ_ASSET_DIR, filename]
      .map(encodeURIComponent)
      .join("/")
  );
}

/**
 * Klasördeki gerçek dosya adlarıyla eşleşir; PNG’ler şablonla aynı tuvalde üst üste binmek için.
 * `boyalı sağ ön çamurluk` dosyasında klasörde çift boşluk var — aynen kullanılır.
 */
export function expertizOverlayFileName(
  panel: PanelKey,
  durum: ExpertizDurum
): string | null {
  if (panel === "on_tampon" || panel === "arka_tampon") return null;

  if (panel === "sag_arka_kapi") {
    if (durum === "değişen") return "sağ arka kapı değişen.png";
    if (durum === "boyalı") return "sağ arka kapı boyalı.png";
    if (durum === "lokal_boyalı") return "sağ arka kapı lokal boyalı.png";
    if (durum === "orijinal") return "sağ arka kapı orjinal.png";
    return null;
  }

  if (durum === "orijinal") return null;

  const prefix =
    durum === "değişen"
      ? "değişen "
      : durum === "boyalı"
        ? "boyalı "
        : "lokal boyalı ";

  const parts: Record<PanelKey, string | null> = {
    kaput: "kaput",
    tavan: "tavan",
    bagaj: "bagaj",
    sol_on_camurluk: "sol ön çamurluk",
    sol_on_kapi: "sol ön kapı",
    sol_arka_kapi: "sol arka kapı",
    sol_arka_camurluk: "sol arka çamurluk",
    sag_on_camurluk: "sağ ön çamurluk",
    sag_on_kapi: "sağ ön kapı",
    sag_arka_kapi: null,
    sag_arka_camurluk: "sağ arka çamurluk",
    on_tampon: null,
    arka_tampon: null,
  };

  const part = parts[panel];
  if (!part) return null;

  if (panel === "sag_on_camurluk" && durum === "boyalı") {
    return "boyalı sağ ön  çamurluk.png";
  }

  return `${prefix}${part}.png`;
}

export const SABLON_FILENAME = "şablon.png";

export function durumEtiket(d: ExpertizDurum): string {
  switch (d) {
    case "değişen":
      return "Değişen";
    case "boyalı":
      return "Boyalı";
    case "lokal_boyalı":
      return "Lokal boyalı";
    default:
      return "Orijinal";
  }
}

export const PANEL_LABELS: Record<keyof typeof PANEL_REGIONS, string> = {
  kaput: "Kaput",
  tavan: "Tavan",
  bagaj: "Bagaj",
  sol_on_camurluk: "Ön sol çamurluk",
  sol_on_kapi: "Ön sol kapı",
  sol_arka_kapi: "Arka sol kapı",
  sol_arka_camurluk: "Arka sol çamurluk",
  sag_on_camurluk: "Ön sağ çamurluk",
  sag_on_kapi: "Ön sağ kapı",
  sag_arka_kapi: "Arka sağ kapı",
  sag_arka_camurluk: "Arka sağ çamurluk",
  on_tampon: "Ön tampon",
  arka_tampon: "Arka tampon",
};

export const PANEL_KEYS = Object.keys(PANEL_LABELS) as PanelKey[];

/** DB’de veya formda eksik parçalar = orijinal kabul edilir (tam şema + önizleme). */
export function mergeExpertizWithDefaults(
  parsed: Record<string, ExpertizDurum> | null | undefined
): Record<PanelKey, ExpertizDurum> {
  const out = {} as Record<PanelKey, ExpertizDurum>;
  for (const k of PANEL_KEYS) {
    const v = parsed?.[k];
    out[k] = v ?? "orijinal";
  }
  return out;
}

/** Sihirbazdaki kısmi state → tam panel haritası (önizleme). */
export function expandExpertizPartial(
  partial: Partial<Record<PanelKey, ExpertizDurum | "">>
): Record<PanelKey, ExpertizDurum> {
  return mergeExpertizWithDefaults(partial as Record<string, ExpertizDurum>);
}
