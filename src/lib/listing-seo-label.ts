import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchVehicleBrandName, type ListingRow } from "@/lib/listings-data";
import { parseDescriptionVehicleSpecs } from "@/lib/listing-vehicle-display";
import {
  fetchListingEnginePackageLabels,
  fetchVehicleBrandModelSeriCode,
  resolveListingVehicleCatalogParts,
} from "@/lib/vehicle-hierarchy";

function cleanPart(value: string | null | undefined): string | null {
  const t = String(value ?? "").trim();
  return t || null;
}

/** Yinelenen parçaları atarak "Marka Model Motor Paket" birleştirir. */
export function composeListingVehicleSeoLabel(parts: {
  brand?: string | null;
  model?: string | null;
  motor?: string | null;
  paket?: string | null;
  fallback?: string | null;
}): string {
  const ordered = [parts.brand, parts.model, parts.motor, parts.paket]
    .map(cleanPart)
    .filter((x): x is string => Boolean(x));

  const deduped: string[] = [];
  for (const part of ordered) {
    const lower = part.toLocaleLowerCase("tr");
    const already = deduped.some((prev) => {
      const p = prev.toLocaleLowerCase("tr");
      return p === lower || p.includes(lower) || lower.includes(p);
    });
    if (!already) deduped.push(part);
  }

  if (deduped.length > 0) return deduped.join(" ");
  return cleanPart(parts.fallback) || "İlan";
}

/**
 * Kart / sitemap gibi sync yerler: marka + vehicle_model (çoğu ilanda model+motor+paket).
 * Tam çözümleme yoksa title'a düşer.
 */
export function listingSeoLabelFromFields(opts: {
  brandName?: string | null;
  vehicleModel?: string | null;
  title?: string | null;
}): string {
  return composeListingVehicleSeoLabel({
    brand: opts.brandName,
    model: opts.vehicleModel,
    fallback: opts.title,
  });
}

function field(
  row: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const v = row[key];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

/**
 * İlan detayı / meta için marka · model · motor · paket etiketini çözer.
 * Google title ve kanonik slug bu metinden üretilir (serbest ilan başlığı değil).
 */
export async function resolveListingSeoVehicleLabel(
  supabase: SupabaseClient,
  listing: ListingRow | Record<string, unknown>
): Promise<string> {
  const row = listing as Record<string, unknown>;
  const brandId = field(row, ["vehicle_brand_id"]);
  const packageId = field(row, ["vehicle_engine_package_id"]);
  const brandModelFk = field(row, ["vehicle_brand_model_id", "brand_model_id"]);
  const rawVehicleModel = field(row, ["vehicle_model"]);
  const rawDesc =
    typeof row.description === "string" ? row.description : "";
  const fallbackTitle = field(row, ["title"]);

  const [brandName, hierarchyLabels, catalogParts, seriCode] =
    await Promise.all([
      brandId
        ? fetchVehicleBrandName(supabase, brandId)
        : Promise.resolve(null),
      packageId
        ? fetchListingEnginePackageLabels(supabase, packageId)
        : Promise.resolve({
            motor: null as string | null,
            paket: null as string | null,
            horsepower: null as number | null,
            engineCapacityCc: null as number | null,
          }),
      !packageId
        ? resolveListingVehicleCatalogParts(supabase, {
            brandId,
            rawModel: rawVehicleModel,
          })
        : Promise.resolve({
            model: null as string | null,
            motor: null as string | null,
            paket: null as string | null,
            horsepower: null as number | null,
            engineCapacityCc: null as number | null,
            variantRemainder: null as string | null,
          }),
      brandModelFk
        ? fetchVehicleBrandModelSeriCode(supabase, brandModelFk)
        : Promise.resolve(null),
    ]);

  const descSpecs = rawDesc.trim()
    ? parseDescriptionVehicleSpecs(rawDesc)
    : {};

  const trimModel =
    field(row, [
      "vehicle_trim",
      "trim",
      "vehicle_variant",
      "variant",
      "vehicle_model_detail",
      "model_detay",
    ]) || null;

  const seriesFromRow = field(row, [
    "vehicle_series",
    "seri",
    "vehicle_seri",
    "series",
    "model_series",
    "vehicle_line",
  ]);

  let model =
    cleanPart(catalogParts.model) ||
    cleanPart(trimModel) ||
    cleanPart(seriCode) ||
    cleanPart(seriesFromRow) ||
    cleanPart(descSpecs.seriModel) ||
    null;

  // vehicle_model çoğu zaman "Model Motor Paket" — parçalar ayrı çözüldüyse model olarak
  // ham metni kullanma; aksi halde sync kartlarla uyum için vehicle_model kalsın.
  const motor =
    cleanPart(hierarchyLabels.motor) ||
    cleanPart(catalogParts.motor) ||
    cleanPart(descSpecs.motor) ||
    field(row, ["engine_note", "motor_note", "engine_name", "motor_name"]) ||
    null;
  const paket =
    cleanPart(hierarchyLabels.paket) ||
    cleanPart(catalogParts.paket) ||
    cleanPart(descSpecs.paket) ||
    field(row, ["package_note", "paket_note", "package_name", "paket_name"]) ||
    null;

  if (!model && rawVehicleModel) {
    if (motor || paket) {
      // motor/paket zaten ayrı; vehicle_model'den ilk token(lar) model olabilir
      const tokens = rawVehicleModel.split(/\s+/).filter(Boolean);
      const drop = new Set(
        [motor, paket]
          .filter(Boolean)
          .flatMap((p) => String(p).toLocaleLowerCase("tr").split(/\s+/))
      );
      const kept = tokens.filter(
        (t) => !drop.has(t.toLocaleLowerCase("tr"))
      );
      model = kept.length > 0 ? kept.join(" ") : rawVehicleModel;
    } else {
      model = rawVehicleModel;
    }
  }

  return composeListingVehicleSeoLabel({
    brand: brandName,
    model,
    motor,
    paket,
    fallback: fallbackTitle,
  });
}
