import type { SupabaseClient } from "@supabase/supabase-js";

export type IdNameRow = {
  id: string;
  name: string | null;
  code?: string | null;
  sort_order?: number | null;
};

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
): Promise<{ motor: string | null; paket: string | null }> {
  const id = packageId?.trim();
  if (!id) return { motor: null, paket: null };

  const { data: pkg, error } = await supabase
    .from("vehicle_engine_packages")
    .select("id,name,code,engine_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !pkg || typeof pkg !== "object") {
    return { motor: null, paket: null };
  }

  const row = pkg as {
    name?: string | null;
    code?: string | null;
    engine_id?: string | null;
  };
  const paket = (row.name?.trim() || row.code?.trim() || "") || null;

  let motor: string | null = null;
  const engineId = row.engine_id?.trim();
  if (engineId) {
    const { data: eng } = await supabase
      .from("vehicle_body_style_engines")
      .select("name,code")
      .eq("id", engineId)
      .maybeSingle();
    if (eng && typeof eng === "object") {
      const e = eng as { name?: string | null; code?: string | null };
      motor = (e.name?.trim() || e.code?.trim() || "") || null;
    }
  }

  return { motor, paket };
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
