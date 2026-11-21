import { DEALER_THEMES } from "@/lib/dealer-theme";
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
    asset: "/menu/galeri.png?v=20261112",
  },
  {
    id: "kiralama",
    labelTr: "Kiralama",
    color: "#0097B2",
    asset: "/menu/kiralama.png?v=20261112",
  },
  {
    id: "expertiz",
    labelTr: "Expertiz",
    color: "#A91414",
    asset: "/menu/expertiz.png?v=20261112",
  },
  {
    id: "parcaci",
    labelTr: "Parça",
    color: "#E65100",
    asset: "/menu/parca.png?v=20261112",
  },
];

export const MAP_SERVICE_LAYERS: MapLayer[] = [
  { id: "servis", labelTr: "Servis", color: "#0D47A1" },
  { id: "kaporta", labelTr: "Kaporta", color: "#6D4C41" },
  { id: "lastik", labelTr: "Lastik", color: "#546E7A" },
  { id: "cekici", labelTr: "Çekici", color: "#FF8F00" },
  { id: "oto_elektrik", labelTr: "Elektrik", color: "#C2185B" },
  { id: "aksesuar", labelTr: "Aksesuar", color: "#827717" },
  { id: "yikama", labelTr: "Yıkama", color: "#039BE5" },
  { id: "sigorta", labelTr: "Sigorta", color: "#1B5E20" },
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
  switch (type) {
    case "galeri":
      return "/menu/galeri.png?v=20261112";
    case "kiralama":
      return "/menu/kiralama.png?v=20261112";
    case "expertiz":
      return "/menu/expertiz.png?v=20261112";
    case "parcaci":
      return "/menu/parca.png?v=20261112";
    default:
      return undefined;
  }
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

export function dealerPinColor(type: string, selected: boolean): string {
  if (DEALER_TYPES.includes(type as DealerType)) {
    const theme = DEALER_THEMES[type as DealerType];
    return selected ? theme.primary : theme.primaryDark;
  }
  return selected ? "#0D47A1" : "#093270";
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
