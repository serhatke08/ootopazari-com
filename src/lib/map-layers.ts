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

export const MAP_LAYERS: MapLayer[] = [
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
  { id: "servis", labelTr: "Servis", color: "#0D47A1" },
];

export const MAP_LAYER_BY_ID = Object.fromEntries(
  MAP_LAYERS.map((layer) => [layer.id, layer])
) as Record<MapLayerId, MapLayer>;

export const TURKEY_CENTER = { lat: 39.0, lng: 35.2 };
export const MAP_MIN_ZOOM = 5;
export const MAP_MAX_ZOOM = 18;
export const MAP_START_ZOOM = 5.6;
export const MAP_POI_MIN_ZOOM = 11;
export const MAP_SHEET_MIN = 0.17;
export const MAP_SHEET_MAX = 0.62;
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
  if (CORE_DEALER_LAYER_IDS.has(type as MapLayerId) && enabled.has(type)) {
    return true;
  }
  if (enabled.has("servis")) {
    return (
      type !== "galeri" &&
      type !== "kiralama" &&
      type !== "expertiz" &&
      type !== "parcaci" &&
      ALL_DEALER_TYPE_CODES.has(type)
    );
  }
  return false;
}

export function dealerTypeShortLabel(code: string): string {
  if (DEALER_TYPES.includes(code as DealerType)) {
    return DEALER_TYPE_LABELS[code as DealerType];
  }
  return code;
}

export function dealerPinColor(type: string, _selected = false): string {
  if (DEALER_TYPES.includes(type as DealerType)) {
    return DEALER_THEMES[type as DealerType].primary;
  }
  return "#0D47A1";
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
  return next;
}

export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function dealerStoreHref(type: string, id: string): string {
  return `/bayi/${encodeURIComponent(type)}/${encodeURIComponent(id)}`;
}
