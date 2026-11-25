"use client";

import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { formatDealerMapAddress } from "@/lib/dealer-map-address";
import type { DealerMapPin } from "@/lib/dealer-map-pins";
import { fetchDealerMapPins } from "@/lib/dealer-map-pins";
import {
  ESRI_STREET_TILES,
  MAP_ENABLED_LAYERS_KEY,
  MAP_ENABLED_LAYERS_KEY_V2,
  MAP_ENABLED_TYPES_LEGACY_KEY,
  MAP_SERVICE_LAYERS,
  MAP_FIT_MAX_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAP_POI_MIN_ZOOM,
  MAP_SHEET_MAX,
  MAP_SHEET_MIN,
  MAP_START_ZOOM,
  POI_LAYER_IDS,
  TURKEY_CENTER,
  dealerLayerAsset,
  dealerMatchesLayer,
  dealerPinColor,
  dealerPinRimLabel,
  dealerPinTagColor,
  dealerStoreHref,
  dealerTypeShortLabel,
  googleMapsDirectionsUrl,
  parseEnabledLayers,
  type MapLayerId,
} from "@/lib/map-layers";
import { fetchMapPoisInBounds, type MapPoi } from "@/lib/map-poi";
import {
  DealerMapLayerBar,
  DealerMapLists,
} from "@/components/dealer-map/DealerMapPanel";
import { DealerVerifiedTick } from "@/components/bayi/DealerVerifiedTick";
import { turkishPersonName } from "@/lib/turkish-person-name";
import { DEALER_TYPES, type DealerType } from "@/lib/bayi-types";
import { dealerTheme } from "@/lib/dealer-theme";

type LeafletNS = typeof import("leaflet");
type LeafletMap = import("leaflet").Map;
type LeafletLayerGroup = import("leaflet").LayerGroup;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function poiSvg(kind: MapPoi["kind"], color: string): string {
  if (kind === "petrol") {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M10 22V8a2 2 0 0 1 2-2h1V4h2v2h1a2 2 0 0 1 2 2v8a2 2 0 0 0 2 2h1V10l-2-2"/><path d="M6 22V6a2 2 0 0 1 2-2h4"/><path d="M6 22h8"/></svg>`;
  }
  if (kind === "food") {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`;
  }
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/></svg>`;
}

function poiColor(kind: MapPoi["kind"]): string {
  if (kind === "petrol") return "#2E7D32";
  if (kind === "food") return "#E65100";
  return "#1565C0";
}

function ZoomButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-white text-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.18)] hover:bg-zinc-50"
    >
      {children}
    </button>
  );
}

function turkishUpper(value: string) {
  return value.replaceAll("i", "İ").replaceAll("ı", "I").toLocaleUpperCase("tr-TR");
}

function dealerPopupTheme(type: string) {
  if (DEALER_TYPES.includes(type as DealerType)) return dealerTheme(type as DealerType);
  return {
    primary: dealerPinTagColor(type),
    primaryDark: dealerPinTagColor(type),
    label: dealerTypeShortLabel(type),
    logoSrc: "",
    soft: "#F4F4F5",
    ink: "#18181B",
  };
}

function DealerPreviewCard({
  dealer,
  coverUrl,
  logoUrl,
  onClose,
  onOpen,
  onDirections,
}: {
  dealer: DealerMapPin;
  coverUrl?: string | null;
  logoUrl?: string | null;
  onClose: () => void;
  onOpen: () => void;
  onDirections: () => void;
}) {
  const theme = dealerPopupTheme(dealer.dealer_type);
  const loc = formatDealerMapAddress(dealer.full_address, dealer.city_name);
  const person =
    dealer.dealer_type === "galeri"
      ? turkishPersonName(dealer.first_name, dealer.last_name)
      : "";
  const yatay = coverUrl?.trim() || "";
  const tabela = logoUrl?.trim() || "";
  return (
    <div
      className="overflow-hidden rounded-[18px] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
      style={{ border: `1.4px solid ${theme.primary}8C` }}
    >
      <div className="relative h-[148px] w-full overflow-hidden rounded-t-[18px] bg-zinc-100">
        {yatay ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={yatay} alt="" className="h-full w-full object-contain" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})`,
            }}
          />
        )}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-base leading-none text-white"
          aria-label="Kapat"
        >
          ×
        </button>
      </div>
      <div className="px-3 pb-2.5 pt-0">
        <div className={`flex items-end gap-2.5 ${tabela ? "-mt-[22px]" : "mt-2.5"}`}>
          {tabela ? (
            <div
              className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white shadow-md ring-[3px] ring-white"
              title="Tabela"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tabela} alt="" className="h-full w-full object-cover" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1 pb-0.5">
            <p className="text-[17px] font-bold tracking-wide text-zinc-900">
              {turkishUpper(dealer.dealer_name)}
              <DealerVerifiedTick
                size={18}
                dealerType={dealer.dealer_type}
                className="ml-0.5 inline-block align-middle"
              />
            </p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span
            className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{
              backgroundColor: `${theme.primary}14`,
              color: theme.primaryDark,
            }}
          >
            {dealerTypeShortLabel(dealer.dealer_type)}
          </span>
          {loc.city ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[11px] font-extrabold text-zinc-900">
              {loc.city}
            </span>
          ) : null}
        </div>
        {person ? (
          <p className="mt-2 truncate text-[13.5px] font-extrabold text-zinc-900">
            {person}
          </p>
        ) : null}
        {loc.line ? (
          <p className="mt-1.5 line-clamp-2 text-[12.5px] font-semibold text-zinc-600">
            {loc.line}
          </p>
        ) : null}
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={onDirections}
            className="flex-1 rounded-xl border px-3 py-2 text-sm font-semibold"
            style={{
              borderColor: `${theme.primary}66`,
              color: theme.primaryDark,
            }}
          >
            Yol tarifi
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: theme.primary }}
          >
            Mağazayı aç
          </button>
        </div>
      </div>
    </div>
  );
}

function PoiPreviewCard({
  poi,
  onClose,
  onDirections,
}: {
  poi: MapPoi;
  onClose: () => void;
  onDirections: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
      <div className="flex items-center gap-2">
        <span style={{ color: poiColor(poi.kind) }} aria-hidden>
          <span
            dangerouslySetInnerHTML={{ __html: poiSvg(poi.kind, poiColor(poi.kind)) }}
          />
        </span>
        <p className="min-w-0 flex-1 truncate text-base font-extrabold text-zinc-900">
          {poi.name}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100"
          aria-label="Kapat"
        >
          ×
        </button>
      </div>
      <button
        type="button"
        onClick={onDirections}
        className="mt-2 w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
      >
        Yol tarifi
      </button>
    </div>
  );
}

export function DealerMap() {
  const router = useRouter();
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletNS | null>(null);
  const markersRef = useRef<LeafletLayerGroup | null>(null);
  const poiTimerRef = useRef<number | null>(null);
  const poiAbortRef = useRef<AbortController | null>(null);
  const dragRef = useRef<{ startY: number; startSize: number } | null>(null);
  const fittedRef = useRef(false);
  const fetchPoisRef = useRef<() => void>(() => {});

  const [enabled, setEnabled] = useState<Set<string>>(() => parseEnabledLayers(null));
  const [filtersReady, setFiltersReady] = useState(false);
  const [dealers, setDealers] = useState<DealerMapPin[]>([]);
  const [pois, setPois] = useState<MapPoi[]>([]);
  const [logoUrls, setLogoUrls] = useState<Record<string, string | null>>({});
  const [coverUrls, setCoverUrls] = useState<Record<string, string | null>>({});
  const [selectedDealer, setSelectedDealer] = useState<DealerMapPin | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<MapPoi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [poiLoading, setPoiLoading] = useState(false);
  const [zoom, setZoom] = useState(MAP_START_ZOOM);
  const [sheetSize, setSheetSize] = useState(MAP_SHEET_MIN);
  const [mapReady, setMapReady] = useState(false);

  const visibleDealers = useMemo(
    () => dealers.filter((d) => dealerMatchesLayer(d.dealer_type, enabled)),
    [dealers, enabled]
  );
  const visiblePois = useMemo(
    () => pois.filter((p) => enabled.has(p.kind)),
    [pois, enabled]
  );

  const persistFilters = useCallback((next: Set<string>) => {
    try {
      localStorage.setItem(MAP_ENABLED_LAYERS_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  }, []);

  const fetchPois = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    const kinds = new Set(
      [...enabled].filter((id) => POI_LAYER_IDS.has(id as MapLayerId))
    );
    const currentZoom = map.getZoom();
    if (kinds.size === 0 || currentZoom < MAP_POI_MIN_ZOOM) {
      setPois((prev) => (prev.length ? [] : prev));
      setPoiLoading(false);
      return;
    }
    poiAbortRef.current?.abort();
    const abort = new AbortController();
    poiAbortRef.current = abort;
    const b = map.getBounds();
    setPoiLoading(true);
    try {
      const rows = await fetchMapPoisInBounds({
        bounds: {
          south: b.getSouth(),
          west: b.getWest(),
          north: b.getNorth(),
          east: b.getEast(),
        },
        kinds,
        signal: abort.signal,
      });
      if (abort.signal.aborted) return;
      setPois(rows);
    } finally {
      if (!abort.signal.aborted) setPoiLoading(false);
    }
  }, [enabled]);

  const schedulePoiFetch = useCallback(() => {
    if (poiTimerRef.current) window.clearTimeout(poiTimerRef.current);
    poiTimerRef.current = window.setTimeout(() => {
      void fetchPois();
    }, 700);
  }, [fetchPois]);
  fetchPoisRef.current = () => {
    void fetchPois();
  };

  const fitVisible = useCallback(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;
    if (visibleDealers.length === 0) {
      map.setView([TURKEY_CENTER.lat, TURKEY_CENTER.lng], MAP_START_ZOOM);
      return;
    }
    const pts = visibleDealers.map(
      (d) => [d.latitude, d.longitude] as [number, number]
    );
    let bounds = L.latLngBounds(pts);
    if (pts.length === 1) {
      const [lat, lng] = pts[0];
      bounds = L.latLngBounds(
        [lat - 2.4, lng - 2.4],
        [lat + 2.4, lng + 2.4]
      );
    }
    map.fitBounds(bounds, {
      paddingTopLeft: [28, 56],
      paddingBottomRight: [28, 160],
      maxZoom: MAP_FIT_MAX_ZOOM,
    });
  }, [visibleDealers]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MAP_ENABLED_LAYERS_KEY);
      const v2 = localStorage.getItem(MAP_ENABLED_LAYERS_KEY_V2);
      const legacy = localStorage.getItem(MAP_ENABLED_TYPES_LEGACY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setEnabled(parseEnabledLayers(parsed.map(String)));
        }
      } else if (v2) {
        const parsed = JSON.parse(v2) as unknown;
        const next = parseEnabledLayers(
          Array.isArray(parsed) ? parsed.map(String) : null
        );
        for (const layer of MAP_SERVICE_LAYERS) next.add(layer.id);
        persistFilters(next);
        setEnabled(next);
      } else if (legacy) {
        const parsed = JSON.parse(legacy) as unknown;
        const next = parseEnabledLayers(
          Array.isArray(parsed) ? parsed.map(String) : null
        );
        for (const poi of POI_LAYER_IDS) next.add(poi);
        setEnabled(next);
      }
    } catch {
      /* ignore */
    }
    setFiltersReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchDealerMapPins();
        if (cancelled) return;
        setDealers(rows);
        setLogoUrls(
          Object.fromEntries(rows.map((p) => [p.id, p.logoUrl ?? null]))
        );
        setCoverUrls(
          Object.fromEntries(rows.map((p) => [p.id, p.coverUrl ?? null]))
        );
        setLoading(false);
      } catch {
        if (!cancelled) {
          setLoading(false);
          setError("Bayi konumları yüklenemedi.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = mapElRef.current;
    if (!el || mapRef.current) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let onResize: (() => void) | null = null;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapElRef.current) return;
      leafletRef.current = L;
      const map = L.map(mapElRef.current, {
        center: [TURKEY_CENTER.lat, TURKEY_CENTER.lng],
        zoom: MAP_START_ZOOM,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
      });
      L.tileLayer(ESRI_STREET_TILES, {
        maxNativeZoom: 19,
        maxZoom: MAP_MAX_ZOOM,
      }).addTo(map);
      const group = L.layerGroup().addTo(map);
      mapRef.current = map;
      markersRef.current = group;
      map.on("moveend", () => {
        setZoom(map.getZoom());
        if (poiTimerRef.current) window.clearTimeout(poiTimerRef.current);
        poiTimerRef.current = window.setTimeout(() => {
          fetchPoisRef.current();
        }, 700);
      });
      map.on("click", () => {
        setSelectedDealer(null);
        setSelectedPoi(null);
      });
      onResize = () => map.invalidateSize();
      window.setTimeout(onResize, 60);
      window.addEventListener("resize", onResize);
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(mapElRef.current);
      setMapReady(true);
      setZoom(map.getZoom());
    })();
    return () => {
      cancelled = true;
      if (poiTimerRef.current) window.clearTimeout(poiTimerRef.current);
      poiAbortRef.current?.abort();
      if (onResize) window.removeEventListener("resize", onResize);
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || fittedRef.current || loading) return;
    fittedRef.current = true;
    fitVisible();
    schedulePoiFetch();
  }, [mapReady, loading, fitVisible, schedulePoiFetch]);

  useEffect(() => {
    if (mapReady) schedulePoiFetch();
  }, [enabled, mapReady, schedulePoiFetch]);

  useEffect(() => {
    const L = leafletRef.current;
    const group = markersRef.current;
    const map = mapRef.current;
    if (!L || !group || !map) return;
    group.clearLayers();

    for (const poi of visiblePois) {
      const selected = selectedPoi?.id === poi.id;
      const color = poiColor(poi.kind);
      const icon = L.divIcon({
        className: "dm-div-icon",
        html: `<div class="dm-poi ${selected ? "is-on" : ""}" style="color:${color};filter:drop-shadow(0 0 4px #fff)">${poiSvg(poi.kind, color)}</div>`,
        iconSize: [34, 40],
        iconAnchor: [17, 40],
      });
      const marker = L.marker([poi.lat, poi.lng], {
        icon,
        zIndexOffset: selected ? 800 : 0,
      });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedPoi(poi);
        setSelectedDealer(null);
      });
      marker.addTo(group);
    }

    for (const dealer of visibleDealers) {
      const selected = selectedDealer?.id === dealer.id;
      const ring = dealerPinColor(dealer.dealer_type, selected);
      const tagColor = dealerPinTagColor(dealer.dealer_type);
      const size = selected ? 44 : 38;
      const logo = logoUrls[dealer.id];
      const asset = dealerLayerAsset(dealer.dealer_type);
      const tag = escapeHtml(dealerPinRimLabel(dealer.dealer_type));
      const inner = logo
        ? `<img src="${escapeHtml(logo)}" alt="" style="width:100%;height:100%;object-fit:cover"/>`
        : asset
          ? `<img src="${escapeHtml(asset)}" alt="" style="width:calc(100% - 10px);height:calc(100% - 10px);object-fit:contain"/>`
          : `<span style="display:block;width:10px;height:10px;border-radius:99px;background:${tagColor}"></span>`;
      const icon = L.divIcon({
        className: "dm-div-icon",
        html: `<div class="dm-pin"><div class="dm-pin-wrap"><div class="dm-pin-dot" style="width:${size}px;height:${size}px;border-color:${ring}">${inner}</div><span class="dm-pin-tag" style="background:${tagColor}">${tag}</span></div><div class="dm-pin-caret" style="color:${tagColor}">▼</div></div>`,
        iconSize: [84, 70],
        iconAnchor: [42, 70],
      });
      const marker = L.marker([dealer.latitude, dealer.longitude], {
        icon,
        zIndexOffset: selected ? 1000 : 200,
      });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedDealer(dealer);
        setSelectedPoi(null);
      });
      marker.addTo(group);
    }
  }, [visibleDealers, visiblePois, selectedDealer, selectedPoi, logoUrls]);

  const zoomBy = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    const next = Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, map.getZoom() + delta));
    map.setZoom(next);
    schedulePoiFetch();
  };

  const toggleType = (id: MapLayerId) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistFilters(next);
      if (selectedDealer && !dealerMatchesLayer(selectedDealer.dealer_type, next)) {
        setSelectedDealer(null);
      }
      if (selectedPoi && !next.has(selectedPoi.kind)) {
        setSelectedPoi(null);
      }
      return next;
    });
  };

  const focusPoint = (lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;
    const next = map.getZoom() < 13 ? 13.5 : map.getZoom();
    map.setView([lat, lng], Math.min(MAP_MAX_ZOOM, next));
  };

  const openDealer = (dealer: DealerMapPin) => {
    router.push(dealerStoreHref(dealer.dealer_type || "galeri", dealer.id));
  };

  const openDirections = (lat: number, lng: number) => {
    window.open(googleMapsDirectionsUrl(lat, lng), "_blank", "noopener,noreferrer");
  };

  const onSheetPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement | null)?.closest("button")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startSize: sheetSize };
  };
  const onSheetPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const h = window.innerHeight || 1;
    const delta = (dragRef.current.startY - e.clientY) / h;
    const next = Math.min(
      MAP_SHEET_MAX,
      Math.max(MAP_SHEET_MIN, dragRef.current.startSize + delta)
    );
    setSheetSize(next);
  };
  const onSheetPointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setSheetSize((size) => (size > 0.4 ? MAP_SHEET_MAX : MAP_SHEET_MIN));
  };

  const sheetExpanded = sheetSize > 0.28;
  const zoomTooFar =
    mapReady && zoom < MAP_POI_MIN_ZOOM && [...enabled].some((id) => POI_LAYER_IDS.has(id as MapLayerId));

  const listProps = {
    enabled,
    dealers: visibleDealers,
    pois: visiblePois,
    logoUrls,
    selectedDealerId: selectedDealer?.id,
    selectedPoiId: selectedPoi?.id,
    poiLoading,
    zoomTooFar,
    onDealerTap: (d: DealerMapPin) => {
      setSelectedDealer(d);
      setSelectedPoi(null);
      focusPoint(d.latitude, d.longitude);
    },
    onPoiTap: (p: MapPoi) => {
      setSelectedPoi(p);
      setSelectedDealer(null);
      focusPoint(p.lat, p.lng);
    },
    onOpenDealer: openDealer,
  };

  return (
    <div data-dealer-map="true" className="dealer-map-root relative flex min-h-0 flex-1 overflow-hidden bg-zinc-100">
      <div className="relative min-h-0 min-w-0 flex-1">
        <div ref={mapElRef} className="absolute inset-0" />

        <div className="pointer-events-none absolute left-2 top-3 z-[500] rounded-sm bg-white/80 px-1.5 py-0.5 text-[9px] text-zinc-700">
          © OpenStreetMap
        </div>

        <div className="absolute right-2.5 top-3 z-[500] flex flex-col gap-2">
          <ZoomButton label="Yakınlaştır" onClick={() => zoomBy(1)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </ZoomButton>
          <ZoomButton label="Uzaklaştır" onClick={() => zoomBy(-1)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M5 12h14" />
            </svg>
          </ZoomButton>
        </div>

        {loading ? (
          <div className="absolute inset-0 z-[510] flex items-center justify-center bg-white/30">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
          </div>
        ) : null}
        {error ? (
          <div className="absolute inset-0 z-[510] flex items-center justify-center px-7">
            <div className="rounded-xl bg-white px-4 py-3 text-center shadow-lg">{error}</div>
          </div>
        ) : null}

        {!sheetExpanded && selectedDealer ? (
          <div className="absolute inset-x-3 z-[520] lg:bottom-4 lg:left-4 lg:right-auto lg:w-[22rem] max-lg:hidden">
            <DealerPreviewCard
              dealer={selectedDealer}
              coverUrl={coverUrls[selectedDealer.id]}
              logoUrl={logoUrls[selectedDealer.id]}
              onClose={() => setSelectedDealer(null)}
              onOpen={() => openDealer(selectedDealer)}
              onDirections={() =>
                openDirections(selectedDealer.latitude, selectedDealer.longitude)
              }
            />
          </div>
        ) : null}
        {!sheetExpanded && selectedPoi ? (
          <div className="absolute inset-x-3 z-[520] lg:bottom-4 lg:left-4 lg:right-auto lg:w-[22rem] max-lg:hidden">
            <PoiPreviewCard
              poi={selectedPoi}
              onClose={() => setSelectedPoi(null)}
              onDirections={() => openDirections(selectedPoi.lat, selectedPoi.lng)}
            />
          </div>
        ) : null}

        {!sheetExpanded && selectedDealer ? (
          <div
            className="absolute inset-x-3 z-[520] lg:hidden"
            style={{ bottom: `calc(${MAP_SHEET_MIN * 100}% + 12px)` }}
          >
            <DealerPreviewCard
              dealer={selectedDealer}
              coverUrl={coverUrls[selectedDealer.id]}
              logoUrl={logoUrls[selectedDealer.id]}
              onClose={() => setSelectedDealer(null)}
              onOpen={() => openDealer(selectedDealer)}
              onDirections={() =>
                openDirections(selectedDealer.latitude, selectedDealer.longitude)
              }
            />
          </div>
        ) : null}
        {!sheetExpanded && selectedPoi ? (
          <div
            className="absolute inset-x-3 z-[520] lg:hidden"
            style={{ bottom: `calc(${MAP_SHEET_MIN * 100}% + 12px)` }}
          >
            <PoiPreviewCard
              poi={selectedPoi}
              onClose={() => setSelectedPoi(null)}
              onDirections={() => openDirections(selectedPoi.lat, selectedPoi.lng)}
            />
          </div>
        ) : null}

        <div
          className="absolute inset-x-0 bottom-0 z-[530] flex flex-col overflow-hidden rounded-t-[18px] bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.16)] lg:hidden"
          style={{ height: `${sheetSize * 100}%` }}
        >
          <div
            className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
            onPointerDown={onSheetPointerDown}
            onPointerMove={onSheetPointerMove}
            onPointerUp={onSheetPointerUp}
            onPointerCancel={onSheetPointerUp}
          >
            <div className="flex flex-col items-center pb-1 pt-2.5">
              <div className="h-1.5 w-12 rounded-full bg-zinc-400" />
            </div>
            <DealerMapLayerBar
              enabled={enabled}
              filtersReady={filtersReady}
              onToggle={toggleType}
              showServiceRow={sheetExpanded}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <DealerMapLists {...listProps} />
          </div>
        </div>
      </div>

      <aside className="relative z-[40] hidden h-full w-[min(24rem,38vw)] shrink-0 flex-col border-l border-zinc-200 bg-white lg:flex">
        <div className="shrink-0 border-b border-zinc-100 px-3 py-3">
          <h1 className="text-base font-extrabold text-zinc-900">Harita</h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            Petrol, yemek, otel ve bayiler
          </p>
        </div>
        <DealerMapLayerBar
          enabled={enabled}
          filtersReady={filtersReady}
          onToggle={toggleType}
          showServiceRow
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DealerMapLists {...listProps} />
        </div>
      </aside>
    </div>
  );
}
