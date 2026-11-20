export type MapPoiKind = "petrol" | "food" | "hotel";

export type MapPoi = {
  id: string;
  kind: MapPoiKind;
  name: string;
  lat: number;
  lng: number;
};

export type MapBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function fallbackName(kind: MapPoiKind): string {
  if (kind === "petrol") return "Petrol";
  if (kind === "food") return "Yeme içme";
  return "Otel";
}

function kindOf(tags: Record<string, string>): MapPoiKind | null {
  const amenity = tags.amenity;
  const tourism = tags.tourism;
  if (amenity === "fuel") return "petrol";
  if (amenity === "restaurant" || amenity === "cafe" || amenity === "fast_food") {
    return "food";
  }
  if (tourism === "hotel" || tourism === "motel") return "hotel";
  return null;
}

function parse(body: string, kinds: Set<string>): MapPoi[] {
  let decoded: unknown;
  try {
    decoded = JSON.parse(body);
  } catch {
    return [];
  }
  if (!decoded || typeof decoded !== "object") return [];
  const elements = (decoded as { elements?: unknown }).elements;
  if (!Array.isArray(elements)) return [];
  const out: MapPoi[] = [];
  const counts: Record<string, number> = {};
  for (const raw of elements) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as {
      id?: number | string;
      lat?: number;
      lon?: number;
      tags?: Record<string, string>;
    };
    const lat = typeof row.lat === "number" ? row.lat : null;
    const lon = typeof row.lon === "number" ? row.lon : null;
    if (lat == null || lon == null) continue;
    const tags = row.tags && typeof row.tags === "object" ? row.tags : {};
    const kind = kindOf(tags);
    if (!kind || !kinds.has(kind)) continue;
    const n = counts[kind] ?? 0;
    if (n >= 50) continue;
    counts[kind] = n + 1;
    const name = String(tags["name:tr"] ?? tags.name ?? fallbackName(kind)).trim();
    out.push({
      id: `poi-${row.id ?? `${lat}-${lon}`}`,
      kind,
      name: name || fallbackName(kind),
      lat,
      lng: lon,
    });
  }
  return out;
}

export async function fetchMapPoisInBounds(args: {
  bounds: MapBounds;
  kinds: Set<string>;
  signal?: AbortSignal;
}): Promise<MapPoi[]> {
  const { bounds, kinds, signal } = args;
  if (kinds.size === 0) return [];
  const { south, west, north, east } = bounds;
  if (south >= north || west >= east) return [];

  const parts: string[] = [];
  if (kinds.has("petrol")) {
    parts.push(`node["amenity"="fuel"](${south},${west},${north},${east});`);
  }
  if (kinds.has("food")) {
    parts.push(`node["amenity"="restaurant"](${south},${west},${north},${east});`);
    parts.push(`node["amenity"="cafe"](${south},${west},${north},${east});`);
    parts.push(`node["amenity"="fast_food"](${south},${west},${north},${east});`);
  }
  if (kinds.has("hotel")) {
    parts.push(`node["tourism"="hotel"](${south},${west},${north},${east});`);
    parts.push(`node["tourism"="motel"](${south},${west},${north},${east});`);
  }
  if (parts.length === 0) return [];

  const query = `[out:json][timeout:12];(${parts.join("")});out body 120;`;
  const body = new URLSearchParams({ data: query });

  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body,
        signal,
      });
      if (!res.ok) continue;
      const text = await res.text();
      return parse(text, kinds);
    } catch (err) {
      if (signal?.aborted) return [];
      void err;
    }
  }
  return [];
}
