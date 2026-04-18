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
  /** `parent_id` / `parent_model_id` null üst satırlar varsa iki kademeli menü */
  hierarchical: boolean;
  /** Üst seviye (Modeller) veya düz listede tüm seriler */
  parents: IdNameRow[];
};

/**
 * Marka altında: üst model satırları (`parent_id` / `parent_model_id` null).
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
        .is("parent_id", null)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true }),
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
      return { hierarchical: true, parents: rows };
    }
  }

  const flat = await fetchBrandModels(supabase, brandId);
  return { hierarchical: false, parents: flat };
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
        .eq("parent_id", parentId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true }),
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
 * FK kolon adı projede farklı olabilir; sırayla denenir.
 */
export async function fetchBodyStylesForModel(
  supabase: SupabaseClient,
  modelId: string
): Promise<IdNameRow[]> {
  const fkColumns = [
    "model_id",
    "vehicle_brand_model_id",
    "brand_model_id",
  ] as const;

  for (const column of fkColumns) {
    const sorted = await supabase
      .from("vehicle_model_body_styles")
      .select("id,name,code,sort_order")
      .eq(column, modelId)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });

    if (!sorted.error && sorted.data) {
      return (sorted.data ?? []) as IdNameRow[];
    }

    const byName = await supabase
      .from("vehicle_model_body_styles")
      .select("id,name,code")
      .eq(column, modelId)
      .order("name", { ascending: true });

    if (!byName.error && byName.data) {
      return (byName.data ?? []) as IdNameRow[];
    }

    const minimal = await supabase
      .from("vehicle_model_body_styles")
      .select("id,name")
      .eq(column, modelId);

    if (!minimal.error && minimal.data && minimal.data.length > 0) {
      return (minimal.data ?? []) as IdNameRow[];
    }
  }

  console.warn(
    "vehicle_model_body_styles: sorgu başarısız veya FK kolonu yok (model_id / vehicle_brand_model_id / brand_model_id)."
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
  const fkColumns = [
    "body_style_id",
    "vehicle_model_body_style_id",
    "model_body_style_id",
    "vehicle_body_style_id",
  ] as const;

  for (const column of fkColumns) {
    const full = await supabase
      .from("vehicle_body_style_engines")
      .select("id,name,code,fuel_type,horsepower,sort_order")
      .eq(column, modelBodyStyleId)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });

    if (!full.error && full.data) {
      return (full.data ?? []) as IdNameRow[];
    }

    const byName = await supabase
      .from("vehicle_body_style_engines")
      .select("id,name,code")
      .eq(column, modelBodyStyleId)
      .order("name", { ascending: true });

    if (!byName.error && byName.data) {
      return (byName.data ?? []) as IdNameRow[];
    }

    const minimal = await supabase
      .from("vehicle_body_style_engines")
      .select("id,name")
      .eq(column, modelBodyStyleId);

    if (!minimal.error && minimal.data && minimal.data.length > 0) {
      return (minimal.data ?? []) as IdNameRow[];
    }
  }

  console.warn(
    "vehicle_body_style_engines: sorgu başarısız veya FK kolonu yok (body_style_id / vehicle_model_body_style_id / …)."
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
  const fkColumns = [
    "engine_id",
    "body_style_engine_id",
    "vehicle_body_style_engine_id",
  ] as const;

  for (const column of fkColumns) {
    const full = await supabase
      .from("vehicle_engine_packages")
      .select("id,name,code,sort_order")
      .eq(column, bodyStyleEngineId)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });

    if (!full.error && full.data) {
      return (full.data ?? []) as IdNameRow[];
    }

    const byName = await supabase
      .from("vehicle_engine_packages")
      .select("id,name,code")
      .eq(column, bodyStyleEngineId)
      .order("name", { ascending: true });

    if (!byName.error && byName.data) {
      return (byName.data ?? []) as IdNameRow[];
    }

    const minimal = await supabase
      .from("vehicle_engine_packages")
      .select("id,name")
      .eq(column, bodyStyleEngineId);

    if (!minimal.error && minimal.data && minimal.data.length > 0) {
      return (minimal.data ?? []) as IdNameRow[];
    }
  }

  console.warn(
    "vehicle_engine_packages: sorgu başarısız veya FK kolonu yok (engine_id / body_style_engine_id / …)."
  );
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
