import type { SupabaseClient } from "@supabase/supabase-js";

export type IdNameRow = {
  id: string;
  name: string | null;
  code?: string | null;
  sort_order?: number | null;
};

type EnginePackageLabels = {
  motor: string | null;
  paket: string | null;
  horsepower: number | null;
  engineCapacityCc: number | null;
};

export type ListingVehicleCatalogParts = EnginePackageLabels & {
  model: string | null;
  variantRemainder: string | null;
};

function cleanLabel(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text || null;
}

function normalizeVehicleText(value: string | null | undefined): string {
  return (value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripLeadingLabel(
  text: string | null | undefined,
  label: string | null | undefined
): string | null {
  const raw = text?.trim();
  const part = label?.trim();
  if (!raw || !part) return raw || null;
  if (normalizeVehicleText(raw) === normalizeVehicleText(part)) return null;
  const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const next = raw
    .replace(new RegExp(`^\\s*${escaped}\\b`, "iu"), "")
    .replace(/^[\s\-–—/]+/, "")
    .trim();
  return next || null;
}

function bestContainedLabel<T extends IdNameRow>(
  rows: T[],
  text: string | null | undefined
): T | null {
  const haystack = normalizeVehicleText(text);
  if (!haystack) return null;
  return [...rows]
    .map((row) => {
      const label = cleanLabel(row.name) ?? cleanLabel(row.code);
      const normalized = normalizeVehicleText(label);
      return { row, label, normalized };
    })
    .filter((item) => item.label && item.normalized && haystack.includes(item.normalized))
    .sort((a, b) => b.normalized.length - a.normalized.length)[0]?.row ?? null;
}

function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function labelForRow(row: IdNameRow | null | undefined): string | null {
  if (!row) return null;
  return cleanLabel(row.name) ?? cleanLabel(row.code);
}

export function formatListingSeriesLine(input: {
  engine?: string | null;
  package?: string | null;
  variantRemainder?: string | null;
  rawModel?: string | null;
  resolvedModel?: string | null;
}): string | null {
  const engine = cleanLabel(input.engine);
  const pack = cleanLabel(input.package);
  const variant = cleanLabel(input.variantRemainder);

  if (engine && pack) {
    const engineNorm = normalizeVehicleText(engine);
    const packNorm = normalizeVehicleText(pack);
    return packNorm.includes(engineNorm) ? pack : `${engine} ${pack}`;
  }
  if (pack) return pack;
  if (engine) return engine;
  if (variant) return variant;

  return stripLeadingLabel(input.rawModel, input.resolvedModel);
}

/**
 * Tablodaki sırayı yansıtır: önce `sort_order`, beraberinde `created_at` (kayıt sırası),
 * kolon yoksa kademeli yedek sorgular (A–Z yok).
 */
export async function fetchBrandsByCategory(
  supabase: SupabaseClient,
  categoryId: string | null
): Promise<IdNameRow[]> {
  if (!categoryId) {
    return [];
  }

  /**
   * 1) `sort_order` → `id` (created_at yok: eksik kolon 400’ünü önler)
   * 2) Tam sıra: sort_order → created_at
   * 3–4) Yedekler
   */
  const tries = [
    () =>
      supabase
        .from("vehicle_brands")
        .select("id,name,code,sort_order")
        .eq("category_id", categoryId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true }),
    () =>
      supabase
        .from("vehicle_brands")
        .select("id,name,code,sort_order,created_at")
        .eq("category_id", categoryId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
    () =>
      supabase
        .from("vehicle_brands")
        .select("id,name,code,created_at")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: true }),
    () =>
      supabase
        .from("vehicle_brands")
        .select("id,name,code")
        .eq("category_id", categoryId)
        .order("id", { ascending: true }),
  ];

  let lastErr: { message?: string } | null = null;
  for (const run of tries) {
    const { data, error } = await run();
    if (!error) return (data ?? []) as IdNameRow[];
    lastErr = error;
  }
  console.warn("vehicle_brands:", lastErr?.message);
  return [];
}

/** Markaya göre modeller — tablo sırası: sort_order → created_at → yedekler. */
export async function fetchBrandModels(
  supabase: SupabaseClient,
  brandId: string
): Promise<IdNameRow[]> {
  const tries = [
    () =>
      supabase
        .from("vehicle_brand_models")
        .select("id,name,code,sort_order")
        .eq("brand_id", brandId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true }),
    () =>
      supabase
        .from("vehicle_brand_models")
        .select("id,name,code,sort_order,created_at")
        .eq("brand_id", brandId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
    () =>
      supabase
        .from("vehicle_brand_models")
        .select("id,name,code,created_at")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: true }),
    () =>
      supabase
        .from("vehicle_brand_models")
        .select("id,name,code")
        .eq("brand_id", brandId)
        .order("id", { ascending: true }),
  ];

  let lastErr: { message?: string } | null = null;
  for (const run of tries) {
    const { data, error } = await run();
    if (!error) return (data ?? []) as IdNameRow[];
    lastErr = error;
  }
  console.warn("vehicle_brand_models:", lastErr?.message);
  return [];
}

export type BrandModelsHierarchyResult = {
  /** `parent_model_id` null üst satırlar varsa iki kademeli menü */
  hierarchical: boolean;
  /** Üst seviye (Modeller) veya düz listede tüm seriler */
  parents: IdNameRow[];
};

/**
 * Marka altında: üst model satırları (`parent_model_id` null).
 * Hiçbiri yoksa tüm `vehicle_brand_models` düz liste olarak döner (`hierarchical: false`).
 */
export async function fetchBrandModelsHierarchy(
  supabase: SupabaseClient,
  brandId: string
): Promise<BrandModelsHierarchyResult> {
  const parentTries = [
    () =>
      supabase
        .from("vehicle_brand_models")
        .select("id,name,code,sort_order")
        .eq("brand_id", brandId)
        .is("parent_model_id", null)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true }),
  ];

  for (const run of parentTries) {
    const { data, error } = await run();
    if (error) continue;
    const rows = (data ?? []) as IdNameRow[];
    if (rows.length > 0) {
      let anyChildren = false;
      for (const row of rows.slice(0, 8)) {
        const children = await fetchChildBrandModels(supabase, row.id);
        if (children.length > 0) {
          anyChildren = true;
          break;
        }
      }
      if (anyChildren) {
        return { hierarchical: true, parents: rows };
      }
    }
  }

  const flat = await fetchBrandModels(supabase, brandId);
  return { hierarchical: false, parents: flat };
}

/** Marka altında kasa/motor seçimine gidebileceğin düz model listesi. */
export async function fetchSelectableBrandModels(
  supabase: SupabaseClient,
  brandId: string
): Promise<IdNameRow[]> {
  const h = await fetchBrandModelsHierarchy(supabase, brandId);
  if (!h.hierarchical) {
    return h.parents;
  }

  const leaves: IdNameRow[] = [];
  for (const parent of h.parents) {
    const children = await fetchChildBrandModels(supabase, parent.id);
    if (children.length > 0) {
      leaves.push(...children);
    } else {
      leaves.push(parent);
    }
  }
  return leaves;
}

/** Üst model satırına bağlı seriler (`vehicle_brand_models`). */
export async function fetchChildBrandModels(
  supabase: SupabaseClient,
  parentId: string
): Promise<IdNameRow[]> {
  const tries = [
    () =>
      supabase
        .from("vehicle_brand_models")
        .select("id,name,code,sort_order")
        .eq("parent_model_id", parentId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true }),
  ];

  for (const run of tries) {
    const { data, error } = await run();
    if (!error && data) return (data ?? []) as IdNameRow[];
  }
  return [];
}

/** İlan detayında Seri satırı: `vehicle_brand_models.code` (boşsa `name`). */
export async function fetchVehicleBrandModelSeriCode(
  supabase: SupabaseClient,
  brandModelId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("vehicle_brand_models")
    .select("code,name")
    .eq("id", brandModelId)
    .maybeSingle();

  if (error) {
    console.warn("vehicle_brand_models by id:", error.message);
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const r = data as { code?: string | null; name?: string | null };
  const code = r.code?.trim();
  if (code) return code;
  const name = r.name?.trim();
  return name || null;
}

/**
 * `vehicle_brand_models.id` → `vehicle_model_body_styles` (Flutter: model_id + sort_order).
 */
export async function fetchBodyStylesForModel(
  supabase: SupabaseClient,
  modelId: string
): Promise<IdNameRow[]> {
  const { data, error } = await supabase
    .from("vehicle_model_body_styles")
    .select("id,name,sort_order")
    .eq("model_id", modelId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (!error && data) {
    return (data ?? []) as IdNameRow[];
  }

  console.warn(
    "vehicle_model_body_styles:",
    error?.message ?? "sorgu başarısız"
  );
  return [];
}

/**
 * `vehicle_model_body_styles.id` → `vehicle_body_style_engines`
 * (Flutter: `body_style_id` + sort_order; listede `name`).
 */
export async function fetchEnginesForBodyStyle(
  supabase: SupabaseClient,
  modelBodyStyleId: string
): Promise<IdNameRow[]> {
  const { data, error } = await supabase
    .from("vehicle_body_style_engines")
    .select("id,name,fuel_type,horsepower,sort_order")
    .eq("body_style_id", modelBodyStyleId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (!error && data) {
    return (data ?? []) as IdNameRow[];
  }

  console.warn(
    "vehicle_body_style_engines:",
    error?.message ?? "sorgu başarısız"
  );
  return [];
}

/**
 * `vehicle_body_style_engines.id` → `vehicle_engine_packages`
 * (Flutter: `engine_id` + sort_order; listede `name`).
 */
export async function fetchPackagesForEngine(
  supabase: SupabaseClient,
  bodyStyleEngineId: string
): Promise<IdNameRow[]> {
  const { data, error } = await supabase
    .from("vehicle_engine_packages")
    .select("id,name,sort_order")
    .eq("engine_id", bodyStyleEngineId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (!error && data) {
    return (data ?? []) as IdNameRow[];
  }

  console.warn(
    "vehicle_engine_packages:",
    error?.message ?? "sorgu başarısız"
  );
  return [];
}

/** İlan detayında `vehicle_engine_package_id` → motor + paket adları. */
export async function fetchListingEnginePackageLabels(
  supabase: SupabaseClient,
  packageId: string | null | undefined
): Promise<EnginePackageLabels> {
  const id = packageId?.trim();
  if (!id) {
    return { motor: null, paket: null, horsepower: null, engineCapacityCc: null };
  }

  const { data: pkg, error } = await supabase
    .from("vehicle_engine_packages")
    .select("name,engine_id,horsepower,engine_capacity_cc")
    .eq("id", id)
    .maybeSingle();

  if (error || !pkg || typeof pkg !== "object") {
    if (error) console.warn("vehicle_engine_packages by id:", error.message);
    return { motor: null, paket: null, horsepower: null, engineCapacityCc: null };
  }

  const row = pkg as {
    name?: string | null;
    engine_id?: string | null;
    horsepower?: number | string | null;
    engine_capacity_cc?: number | string | null;
  };

  const paket = cleanLabel(row.name);

  let motor: string | null = null;
  let horsepower: number | null = numberOrNull(row.horsepower);
  let engineCapacityCc: number | null = numberOrNull(row.engine_capacity_cc);
  const engineId = row.engine_id?.trim();
  if (engineId) {
    const { data: eng } = await supabase
      .from("vehicle_body_style_engines")
      .select("name,horsepower")
      .eq("id", engineId)
      .maybeSingle();
    if (eng && typeof eng === "object") {
      const e = eng as {
        name?: string | null;
        horsepower?: number | string | null;
      };
      motor = cleanLabel(e.name);
      horsepower = horsepower ?? numberOrNull(e.horsepower);
    }
  }

  return { motor, paket, horsepower, engineCapacityCc };
}

export async function resolveListingVehicleCatalogParts(
  supabase: SupabaseClient,
  input: {
    brandId?: string | null;
    rawModel?: string | null;
  }
): Promise<ListingVehicleCatalogParts> {
  const brandId = input.brandId?.trim();
  const rawModel = input.rawModel?.trim();
  if (!brandId || !rawModel) {
    return {
      model: null,
      motor: null,
      paket: null,
      horsepower: null,
      engineCapacityCc: null,
      variantRemainder: rawModel || null,
    };
  }

  const models = await fetchBrandModels(supabase, brandId);
  const matchedModel = bestContainedLabel(models, rawModel);
  const model = labelForRow(matchedModel);
  const variantRemainder = stripLeadingLabel(rawModel, model);

  if (!matchedModel?.id) {
    return {
      model: null,
      motor: null,
      paket: null,
      horsepower: null,
      engineCapacityCc: null,
      variantRemainder: rawModel,
    };
  }

  const bodyStyles = await fetchBodyStylesForModel(supabase, matchedModel.id);
  if (bodyStyles.length === 0) {
    return {
      model,
      motor: null,
      paket: null,
      horsepower: null,
      engineCapacityCc: null,
      variantRemainder,
    };
  }

  const bodyStyleIds = bodyStyles.map((row) => row.id).filter(Boolean);
  const { data: engineData, error: engineError } = await supabase
    .from("vehicle_body_style_engines")
    .select("id,name,horsepower,sort_order")
    .in("body_style_id", bodyStyleIds)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (engineError || !engineData) {
    if (engineError) {
      console.warn("vehicle_body_style_engines by model:", engineError.message);
    }
    return {
      model,
      motor: null,
      paket: null,
      horsepower: null,
      engineCapacityCc: null,
      variantRemainder,
    };
  }

  const engines = engineData as Array<
    IdNameRow & { horsepower?: number | string | null }
  >;
  const engineIds = engines.map((row) => row.id).filter(Boolean);
  const { data: packageData, error: packageError } = engineIds.length
    ? await supabase
        .from("vehicle_engine_packages")
        .select("id,name,engine_id,horsepower,engine_capacity_cc,sort_order")
        .in("engine_id", engineIds)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true })
    : { data: null, error: null };

  const packages = !packageError && packageData
    ? (packageData as Array<
        IdNameRow & {
          engine_id?: string | null;
          horsepower?: number | string | null;
          engine_capacity_cc?: number | string | null;
        }
      >)
    : [];
  if (packageError) {
    console.warn("vehicle_engine_packages by model:", packageError.message);
  }

  const packageMatch =
    bestContainedLabel(packages, variantRemainder) ??
    bestContainedLabel(packages, rawModel);
  const packageEngine = packageMatch?.engine_id
    ? engines.find((row) => row.id === packageMatch.engine_id) ?? null
    : null;
  const engineMatch =
    packageEngine ??
    bestContainedLabel(engines, variantRemainder) ??
    bestContainedLabel(engines, rawModel);

  return {
    model,
    motor: labelForRow(engineMatch),
    paket: labelForRow(packageMatch),
    horsepower:
      numberOrNull(packageMatch?.horsepower) ?? numberOrNull(engineMatch?.horsepower),
    engineCapacityCc: numberOrNull(packageMatch?.engine_capacity_cc),
    variantRemainder,
  };
}

/** Tek satır adı (kasa / motor / paket / model). */
export async function fetchHierarchyRowName(
  supabase: SupabaseClient,
  table:
    | "vehicle_brand_models"
    | "vehicle_model_body_styles"
    | "vehicle_body_style_engines"
    | "vehicle_engine_packages",
  id: string
): Promise<string | null> {
  if (table !== "vehicle_brand_models") {
    const { data, error } = await supabase
      .from(table)
      .select("name")
      .eq("id", id)
      .maybeSingle();
    if (error || !data || typeof data !== "object") return null;
    const r = data as { name?: string | null };
    return r.name?.trim() || null;
  }

  const { data, error } = await supabase
    .from(table)
    .select("name,code")
    .eq("id", id)
    .maybeSingle();
  if (error || !data || typeof data !== "object") return null;
  const r = data as { name?: string | null; code?: string | null };
  return r.name?.trim() || r.code?.trim() || null;
}

/** Motor altındaki paket id’leri (`listings.vehicle_engine_package_id` filtresi). */
export async function fetchPackageIdsForEngine(
  supabase: SupabaseClient,
  engineId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("vehicle_engine_packages")
    .select("id")
    .eq("engine_id", engineId);
  if (!error && data?.length) {
    return (data as { id: string }[]).map((r) => r.id).filter(Boolean);
  }
  return [];
}

export async function fetchPackageIdsForBrandModel(
  supabase: SupabaseClient,
  modelId: string
): Promise<string[]> {
  const bodyStyles = await fetchBodyStylesForModel(supabase, modelId);
  const bodyStyleIds = bodyStyles.map((row) => row.id).filter(Boolean);
  if (bodyStyleIds.length === 0) return [];

  const { data: engines, error: engineError } = await supabase
    .from("vehicle_body_style_engines")
    .select("id")
    .in("body_style_id", bodyStyleIds);
  if (engineError || !engines?.length) return [];

  const engineIds = (engines as { id?: string | null }[])
    .map((row) => row.id)
    .filter((id): id is string => Boolean(id));
  if (engineIds.length === 0) return [];

  const { data: packages, error: packageError } = await supabase
    .from("vehicle_engine_packages")
    .select("id")
    .in("engine_id", engineIds);
  if (packageError || !packages?.length) return [];

  return (packages as { id?: string | null }[])
    .map((row) => row.id)
    .filter((id): id is string => Boolean(id));
}

export async function fetchEngineLabelsForBrandModel(
  supabase: SupabaseClient,
  modelId: string
): Promise<string[]> {
  const bodyStyles = await fetchBodyStylesForModel(supabase, modelId);
  const bodyStyleIds = bodyStyles.map((row) => row.id).filter(Boolean);
  if (bodyStyleIds.length === 0) return [];

  const { data, error } = await supabase
    .from("vehicle_body_style_engines")
    .select("name")
    .in("body_style_id", bodyStyleIds);
  if (error || !data?.length) return [];

  return [...new Set(
    (data as { name?: string | null }[])
      .map((row) => row.name?.trim())
      .filter((name): name is string => Boolean(name))
  )];
}

/** İlan formunda motor seçilince yakıt / güç otomatik doldurmak için. */
export async function fetchBodyStyleEngineRow(
  supabase: SupabaseClient,
  engineId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("vehicle_body_style_engines")
    .select("*")
    .eq("id", engineId)
    .maybeSingle();
  if (error || !data || typeof data !== "object") return null;
  return data as Record<string, unknown>;
}
