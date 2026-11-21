"use client";

import { Children, type ReactNode } from "react";
import type { DealerMapPin } from "@/lib/dealer-map-pins";
import {
  MAP_PRIMARY_LAYERS,
  MAP_SERVICE_LAYERS,
  dealerLayerAsset,
  dealerThemePrimary,
  dealerTypeShortLabel,
  type MapLayer,
  type MapLayerId,
} from "@/lib/map-layers";
import type { MapPoi } from "@/lib/map-poi";

function LayerGlyph({
  layer,
  active,
}: {
  layer: MapLayer;
  active: boolean;
}) {
  const fg = active ? layer.color : "#9E9E9E";
  if (layer.asset) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={layer.asset}
        alt=""
        width={16}
        height={16}
        className={`h-4 w-4 object-contain ${active ? "opacity-100" : "opacity-45"}`}
      />
    );
  }
  if (layer.id === "petrol") {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2" aria-hidden>
        <path d="M10 22V8a2 2 0 0 1 2-2h1V4h2v2h1a2 2 0 0 1 2 2v8a2 2 0 0 0 2 2h1V10l-2-2" />
        <path d="M6 22V6a2 2 0 0 1 2-2h4" />
        <path d="M6 22h8" />
      </svg>
    );
  }
  if (layer.id === "food") {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2" aria-hidden>
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
      </svg>
    );
  }
  if (layer.id === "hotel") {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2" aria-hidden>
        <path d="M3 21V8l9-5 9 5v13" />
        <path d="M9 21v-6h6v6" />
      </svg>
    );
  }
  return <span className="block h-2.5 w-2.5 rounded-full" style={{ background: fg }} />;
}

function MiniLayerButton({
  layer,
  active,
  onToggle,
}: {
  layer: MapLayer;
  active: boolean;
  onToggle: (id: MapLayerId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(layer.id)}
      className="flex h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-[10px] bg-white px-0.5 transition"
      style={{
        border: `${active ? 1.6 : 1}px solid ${active ? layer.color : "#D8D8D8"}`,
      }}
      aria-pressed={active}
      title={layer.labelTr}
    >
      <LayerGlyph layer={layer} active={active} />
      <span
        className="mt-[3px] max-w-full truncate text-[8px] font-extrabold leading-none"
        style={{ color: active ? layer.color : "#9E9E9E" }}
      >
        {layer.labelTr}
      </span>
    </button>
  );
}

function LogoDot({
  color,
  asset,
  imageUrl,
  size = 34,
}: {
  color: string;
  asset?: string;
  imageUrl?: string | null;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white"
      style={{
        width: size,
        height: size,
        border: `2px solid ${color}`,
      }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : asset ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset} alt="" className="h-[70%] w-[70%] object-contain" />
      ) : (
        <span className="block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      )}
    </span>
  );
}

function SheetSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: string | null;
  children: ReactNode;
}) {
  const hasKids = Children.toArray(children).length > 0;
  return (
    <section className="mb-3">
      <h3 className="text-[13px] font-extrabold text-zinc-900">{title}</h3>
      <div className="mt-1.5">
        {hasKids ? children : empty ? (
          <p className="text-xs text-zinc-600">{empty}</p>
        ) : null}
      </div>
    </section>
  );
}

function SheetTile({
  title,
  subtitle,
  color,
  selected,
  onClick,
  onOpen,
  asset,
  imageUrl,
}: {
  title: string;
  subtitle: string;
  color: string;
  selected: boolean;
  onClick: () => void;
  onOpen?: () => void;
  asset?: string;
  imageUrl?: string | null;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-1 py-1.5 ${
        selected ? "bg-zinc-100" : "bg-transparent"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <LogoDot color={color} asset={asset} imageUrl={imageUrl} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-bold text-zinc-900">
            {title || subtitle}
          </span>
          <span className="block truncate text-xs text-zinc-600">{subtitle}</span>
        </span>
      </button>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="Mağazayı aç"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

export function DealerMapLayerBar({
  enabled,
  filtersReady,
  onToggle,
  showServiceRow = false,
}: {
  enabled: Set<string>;
  filtersReady: boolean;
  onToggle: (id: MapLayerId) => void;
  showServiceRow?: boolean;
}) {
  return (
    <div className="shrink-0">
      <div className="flex gap-1 px-1.5 pb-1.5 pt-2">
        {MAP_PRIMARY_LAYERS.map((layer) => (
          <MiniLayerButton
            key={layer.id}
            layer={layer}
            active={filtersReady && enabled.has(layer.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
      {showServiceRow ? (
        <div className="flex gap-1 px-1.5 pb-1.5">
          {MAP_SERVICE_LAYERS.map((layer) => (
            <MiniLayerButton
              key={layer.id}
              layer={layer}
              active={filtersReady && enabled.has(layer.id)}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DealerMapLists({
  enabled,
  dealers,
  pois,
  logoUrls,
  selectedDealerId,
  selectedPoiId,
  poiLoading,
  zoomTooFar,
  onDealerTap,
  onPoiTap,
  onOpenDealer,
}: {
  enabled: Set<string>;
  dealers: DealerMapPin[];
  pois: MapPoi[];
  logoUrls: Record<string, string | null>;
  selectedDealerId?: string | null;
  selectedPoiId?: string | null;
  poiLoading: boolean;
  zoomTooFar: boolean;
  onDealerTap: (dealer: DealerMapPin) => void;
  onPoiTap: (poi: MapPoi) => void;
  onOpenDealer: (dealer: DealerMapPin) => void;
}) {
  const petrol = pois.filter((p) => p.kind === "petrol");
  const food = pois.filter((p) => p.kind === "food");
  const hotels = pois.filter((p) => p.kind === "hotel");

  return (
    <div className="space-y-0 px-3 pb-6">
      {zoomTooFar ? (
        <p className="mb-2.5 text-[12.5px] font-semibold text-zinc-600">
          Petrol, yemek ve otel için haritayı yaklaştır.
        </p>
      ) : null}
      {poiLoading ? (
        <div className="mb-2.5 h-0.5 overflow-hidden rounded bg-zinc-200">
          <div className="h-full w-1/2 animate-pulse bg-zinc-700" />
        </div>
      ) : null}

      {enabled.has("petrol") ? (
        <SheetSection
          title="Petrol"
          empty={zoomTooFar ? null : "Bu alanda petrol yok."}
        >
          {petrol.map((p) => (
            <SheetTile
              key={p.id}
              title={p.name}
              subtitle="Petrol istasyonu"
              color="#2E7D32"
              selected={selectedPoiId === p.id}
              onClick={() => onPoiTap(p)}
            />
          ))}
        </SheetSection>
      ) : null}

      {enabled.has("food") ? (
        <SheetSection
          title="Yeme içme"
          empty={zoomTooFar ? null : "Bu alanda yeme içme yok."}
        >
          {food.map((p) => (
            <SheetTile
              key={p.id}
              title={p.name}
              subtitle="Yeme içme"
              color="#E65100"
              selected={selectedPoiId === p.id}
              onClick={() => onPoiTap(p)}
            />
          ))}
        </SheetSection>
      ) : null}

      {enabled.has("hotel") ? (
        <SheetSection
          title="Oteller"
          empty={zoomTooFar ? null : "Bu alanda otel yok."}
        >
          {hotels.map((p) => (
            <SheetTile
              key={p.id}
              title={p.name}
              subtitle="Otel"
              color="#1565C0"
              selected={selectedPoiId === p.id}
              onClick={() => onPoiTap(p)}
            />
          ))}
        </SheetSection>
      ) : null}

      <SheetSection title="Bayiler" empty="Haritada pinli bayi yok.">
        {dealers.map((d) => (
          <SheetTile
            key={d.id}
            title={d.dealer_name.trim().toLocaleUpperCase("tr-TR")}
            subtitle={dealerTypeShortLabel(d.dealer_type)}
            color={dealerThemePrimary(d.dealer_type)}
            asset={dealerLayerAsset(d.dealer_type)}
            imageUrl={logoUrls[d.id]}
            selected={selectedDealerId === d.id}
            onClick={() => onDealerTap(d)}
            onOpen={() => onOpenDealer(d)}
          />
        ))}
      </SheetSection>
    </div>
  );
}
