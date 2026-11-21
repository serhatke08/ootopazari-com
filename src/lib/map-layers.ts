import { DEALER_THEMES } from "@/lib/dealer-theme";
import { dealerTypeLogoSrc } from "@/lib/dealer-logos";
import { DEALER_TYPE_LABELS, DEALER_TYPES, type DealerType } from "@/lib/bayi-types";

export const MAP_LAYER_IDS = [
  "petrol",
  "food",
  "hotel",
  "galeri",
  "kiralama",
  "expertiz",
  "parcaci",
  "servis",
  "kaporta",
  "lastik",
  "cekici",
  "oto_elektrik",
  "aksesuar",
  "yikama",
  "sigorta",
] as const;

export type MapLayerId = (typeof MAP_LAYER_IDS)[number];

export const POI_LAYER_IDS = new Set<MapLayerId>(["petrol", "food", "hotel"]);
export const CORE_DEALER_LAYER_IDS = new Set<MapLayerId>([
  "galeri",
  "kiralama",
  "expertiz",
  "parcaci",
]);

export type MapLayer = {
  id: MapLayerId;
  labelTr: string;
  color: string;
  asset?: string;
};

export const MAP_PRIMARY_LAYERS: MapLayer[] = [
  { id: "petrol", labelTr: "Petrol", color: "#2E7D32" },
  { id: "food", labelTr: "Yemek", color: "#E65100" },
  { id: "hotel", labelTr: "Otel", color: "#1565C0" },
  {
    id: "galeri",
    labelTr: "Galeri",
    color: "#5D17EB",
    asset: dealerTypeLogoSrc("galeri"),
  },
  {
    id: "kiralama",
    labelTr: "Kiralama",
    color: "#0097B2",
    asset: dealerTypeLogoSrc("kiralama"),
  },
  {
    id: "expertiz",
    labelTr: "Expertiz",
    color: "#A91414",
    asset: dealerTypeLogoSrc("expertiz"),
  },
  {
    id: "parcaci",
    labelTr: "Parça",
    color: "#E65100",
    asset: dealerTypeLogoSrc("parcaci"),
  },
];

export const MAP_SERVICE_LAYERS: MapLayer[] = [
  { id: "servis", labelTr: "Servis", color: "#0D47A1", asset: dealerTypeLogoSrc("servis") },
  { id: "kaporta", labelTr: "Kaporta", color: "#6D4C41", asset: dealerTypeLogoSrc("kaporta") },
  { id: "lastik", labelTr: "Lastik", color: "#546E7A", asset: dealerTypeLogoSrc("lastik") },
  { id: "cekici", labelTr: "Çekici", color: "#FF8F00", asset: dealerTypeLogoSrc("cekici") },
  { id: "oto_elektrik", labelTr: "Elektrik", color: "#C2185B", asset: dealerTypeLogoSrc("oto_elektrik") },
  { id: "aksesuar", labelTr: "Aksesuar", color: "#827717", asset: dealerTypeLogoSrc("aksesuar") },
  { id: "yikama", labelTr: "Yıkama", color: "#039BE5", asset: dealerTypeLogoSrc("yikama") },
  { id: "sigorta", labelTr: "Sigorta", color: "#1B5E20", asset: dealerTypeLogoSrc("sigorta") },
];

export const MAP_LAYERS: MapLayer[] = [
  ...MAP_PRIMARY_LAYERS,
  ...MAP_SERVICE_LAYERS,
];

export const MAP_LAYER_BY_ID = Object.fromEntries(
  MAP_LAYERS.map((layer) => [layer.id, layer])
) as Record<MapLayerId, MapLayer>;

export const TURKEY_CENTER = { lat: 39.0, lng: 35.2 };
export const MAP_MIN_ZOOM = 5;
export const MAP_MAX_ZOOM = 18;
export const MAP_START_ZOOM = 5.6;
export const MAP_POI_MIN_ZOOM = 11;
export const MAP_SHEET_MIN = 0.2;
export const MAP_SHEET_MAX = 0.72;
export const MAP_FIT_MAX_ZOOM = 6.8;
export const MAP_ENABLED_LAYERS_KEY = "dealer_map_enabled_layers_v2";
export const MAP_ENABLED_TYPES_LEGACY_KEY = "dealer_map_enabled_types";
export const ESRI_STREET_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";

export const ALL_DEALER_TYPE_CODES = new Set<string>(DEALER_TYPES);

export function dealerLayerAsset(type: string): string | undefined {
  return dealerTypeLogoSrc(type);
}

export function dealerMatchesLayer(type: string, enabled: Set<string>): boolean {
  return enabled.has(type);
}

export function dealerTypeShortLabel(code: string): string {
  if (DEALER_TYPES.includes(code as DealerType)) {
    return DEALER_TYPE_LABELS[code as DealerType];
  }
  return code;
}

/** Harita pini kenarı — kısa tür yazısı. */
export function dealerPinRimLabel(type: string): string {
  switch (type) {
    case "galeri":
      return "GALERİ";
    case "kiralama":
      return "KİRALAMA";
    case "expertiz":
      return "EXPERTİZ";
    case "parcaci":
      return "PARÇA";
    case "servis":
      return "SERVİS";
    case "kaporta":
      return "KAPORTA";
    case "lastik":
      return "LASTİK";
    case "cekici":
      return "ÇEKİCİ";
    case "oto_elektrik":
      return "ELEKTRİK";
    case "aksesuar":
      return "AKSESUAR";
    case "yikama":
      return "YIKAMA";
    case "sigorta":
      return "SİGORTA";
    default:
      return type.toLocaleUpperCase("tr-TR");
  }
}

/** Uygulama harita pini — DealerStorefrontTheme primary / accent. */
const PIN_COLORS: Record<string, { primary: string; accent: string }> = {
  galeri: { primary: "#5D17EB", accent: "#8B5CF6" },
  kiralama: { primary: "#0097B2", accent: "#4DD0E1" },
  expertiz: { primary: "#A91414", accent: "#E57373" },
  parcaci: { primary: "#E65100", accent: "#FF9800" },
  servis: { primary: "#0D47A1", accent: "#0D47A1" },
  kaporta: { primary: "#6D4C41", accent: "#6D4C41" },
  lastik: { primary: "#546E7A", accent: "#546E7A" },
  cekici: { primary: "#FF8F00", accent: "#FF8F00" },
  oto_elektrik: { primary: "#C2185B", accent: "#C2185B" },
  aksesuar: { primary: "#827717", accent: "#827717" },
  yikama: { primary: "#039BE5", accent: "#039BE5" },
  sigorta: { primary: "#1B5E20", accent: "#1B5E20" },
};

export function dealerPinColor(type: string, selected: boolean): string {
  const c = PIN_COLORS[type] ?? { primary: "#0D47A1", accent: "#1565C0" };
  return selected ? c.primary : c.accent;
}

export function dealerPinTagColor(type: string): string {
  return PIN_COLORS[type]?.primary ?? "#0D47A1";
}

export function dealerThemePrimary(type: string): string {
  if (DEALER_TYPES.includes(type as DealerType)) {
    return DEALER_THEMES[type as DealerType].primary;
  }
  return "#0D47A1";
}

export function defaultEnabledLayers(): Set<MapLayerId> {
  return new Set(MAP_LAYER_IDS);
}

export function parseEnabledLayers(raw: string[] | null): Set<MapLayerId> {
  const allowed = new Set<string>(MAP_LAYER_IDS);
  const next = new Set<MapLayerId>();
  if (!raw) return defaultEnabledLayers();
  for (const id of raw) {
    if (allowed.has(id)) next.add(id as MapLayerId);
  }
  const serviceIds = MAP_SERVICE_LAYERS.map((l) => l.id);
  const hasSplitServices = serviceIds.some(
    (id) => id !== "servis" && next.has(id)
  );
  if (next.has("servis") && !hasSplitServices) {
    for (const id of serviceIds) next.add(id);
  }
  return next.size > 0 ? next : defaultEnabledLayers();
}

export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function dealerStoreHref(type: string, id: string): string {
  return `/bayi/${encodeURIComponent(type)}/${encodeURIComponent(id)}`;
}
