"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FallbackImg } from "@/components/FallbackImg";
import { useIsClient } from "@/hooks/use-is-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  categoryIconFallbackUrl,
  categoryIconUrlForCategory,
} from "@/lib/category-icon";
import { getBrandLogoUrl } from "@/lib/brand-logo";
import { getMotorLogoUrl } from "@/lib/motor-logo";
import {
  fetchApprovedListingCountsByField,
  fetchApprovedListingCountsByVehicleBrandModelId,
  fetchApprovedListingCountsByVehicleModel,
  formatListingCount,
  normalizeListingModelKey,
  type CategoryRow,
} from "@/lib/listings-data";
import { categoryIdIsMotorcycle } from "@/lib/vehicle-category-slots";
import type { IdNameRow } from "@/lib/vehicle-hierarchy";
import {
  fetchBrandsByCategory,
  fetchSelectableBrandModels,
  fetchBodyStylesForModel,
  fetchEnginesForBodyStyle,
  fetchPackagesForEngine,
} from "@/lib/vehicle-hierarchy";

function label(text: string, compact?: boolean) {
  return (
    <label
      className={
        compact
          ? "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
          : "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
      }
    >
      {text}
    </label>
  );
}

function categoryListRowClass(active: boolean, compact?: boolean) {
  const ring = compact ? "ring-1 ring-amber-400/70" : "ring-2 ring-amber-400/70";
  const base = compact
    ? "flex w-full min-w-0 items-center justify-between gap-1.5 rounded-md border px-2 py-1.5 text-left text-xs font-semibold transition"
    : "flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border px-2.5 py-2.5 text-left text-sm font-semibold transition";
  return [
    base,
    active
      ? `border-amber-500 bg-[#ffcc00] text-zinc-900 shadow-sm ${ring}`
      : "border-zinc-300 bg-white text-zinc-800 hover:border-[#ffcc00] hover:bg-amber-50/60",
  ].join(" ");
}

function brandListRowClass(active: boolean, compact?: boolean) {
  const ring = compact ? "ring-1 ring-amber-400/70" : "ring-2 ring-amber-400/70";
  const base = compact
    ? "flex w-full min-w-0 flex-row items-center gap-1.5 rounded-md border px-1.5 py-1.5 text-left text-[11px] transition"
    : "flex w-full min-w-0 flex-row items-center gap-2 rounded-md border px-2 py-2 text-left text-xs transition";
  return [
    base,
    active
      ? `border-amber-500 bg-[#ffcc00] shadow-sm ${ring}`
      : "border-zinc-300 bg-white hover:border-[#ffcc00] hover:bg-amber-50/60",
  ].join(" ");
}

function sectionTitle(text: string) {
  return (
    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
      {text}
    </p>
  );
}

function selectClass(compact?: boolean) {
  return compact
    ? "w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-[11px] font-medium text-zinc-800"
    : "w-full rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-xs font-medium text-zinc-800";
}

function rowLabel(row: IdNameRow): string {
  return row.name?.trim() || row.code?.trim() || row.id;
}

function listingCountBadge(n: number, compact?: boolean) {
  return (
    <span
      className={
        compact
          ? "shrink-0 rounded-full bg-zinc-100 px-1 py-0.5 text-[9px] font-semibold tabular-nums text-zinc-600"
          : "shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-600"
      }
      title={`${formatListingCount(n)} ilan`}
    >
      {formatListingCount(n)}
    </span>
  );
}

function cascadeRootClass(fillColumn?: boolean, compact?: boolean) {
  if (fillColumn) {
    return compact
      ? "flex w-full min-h-0 flex-col gap-1.5"
      : "flex w-full min-h-0 flex-col gap-2.5";
  }
  return compact ? "w-full space-y-1.5" : "w-full space-y-2";
}

function cascadeListClass(fillColumn?: boolean, compact?: boolean) {
  if (fillColumn) {
    return compact ? "flex flex-col gap-2" : "flex flex-col gap-3";
  }
  return compact ? "flex flex-col gap-0.5" : "flex flex-col gap-1";
}

function VehicleCascadeSidebarPlaceholder({
  fillColumn,
  compact,
}: {
  fillColumn?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cascadeRootClass(fillColumn, compact)} aria-hidden>
      <div className="min-h-[12rem] rounded-lg border border-zinc-200 bg-zinc-50/90" />
    </div>
  );
}

function VehicleCascadeSidebarInner({
  categories,
  onNavigate,
  fillColumn = false,
  compact = false,
}: {
  categories: CategoryRow[];
  /** Örn. çekmece menüyü kapat */
  onNavigate?: () => void;
  /** Ana sayfa sol sütun: dikeyde boşlukları doldur, kategori satırlarını yay */
  fillColumn?: boolean;
  /** Masaüstü sol menü: daha dar / küçük tip */
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const categorySlots = useMemo(() => {
    return [...categories]
      .sort(
        (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999)
      )
      .map((c, i) => ({
        id: c.id,
        label: (c.name ?? c.code ?? "Kategori").trim(),
        icon: categoryIconUrlForCategory(c.code, i + 1),
      }));
  }, [categories]);

  const [categoryId, setCategoryId] = useState("");
  /** Açık kategori (markalar bu satırın altında, içeride gösterilir); tekrar tıklanınca kapanır */
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(
    null
  );
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [bodyStyleId, setBodyStyleId] = useState("");
  const [engineId, setEngineId] = useState("");
  const [packageId, setPackageId] = useState("");

  const [brands, setBrands] = useState<IdNameRow[]>([]);
  const [selectableModels, setSelectableModels] = useState<IdNameRow[]>([]);
  const [bodyStyles, setBodyStyles] = useState<IdNameRow[]>([]);
  const [engines, setEngines] = useState<IdNameRow[]>([]);
  const [packages, setPackages] = useState<IdNameRow[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [loadingBodyStyles, setLoadingBodyStyles] = useState(false);
  const [loadingEngines, setLoadingEngines] = useState(false);

  const [loadingBrands, setLoadingBrands] = useState(false);
  /** Hangi markanın altında model / kasa / motor paneli açık */
  const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null);

  const [categoryCounts, setCategoryCounts] = useState<Map<string, number>>(
    () => new Map()
  );
  const [brandCounts, setBrandCounts] = useState<Map<string, number>>(
    () => new Map()
  );
  const [modelNameCounts, setModelNameCounts] = useState<Map<string, number>>(
    () => new Map()
  );
  const [seriesIdCounts, setSeriesIdCounts] = useState<Map<string, number>>(
    () => new Map()
  );

  const allModelsForNav = selectableModels;

  const brandIdRef = useRef(brandId);
  const modelIdRef = useRef(modelId);
  const bodyStyleIdRef = useRef(bodyStyleId);
  const engineIdRef = useRef(engineId);

  useEffect(() => {
    brandIdRef.current = brandId;
    modelIdRef.current = modelId;
    bodyStyleIdRef.current = bodyStyleId;
    engineIdRef.current = engineId;
  }, [brandId, modelId, bodyStyleId, engineId]);

  const isMotoCategory = useMemo(
    () => categoryIdIsMotorcycle(categoryId, categories),
    [categoryId, categories]
  );

  /**
   * Ana sayfada `router.push(/?category_id=&vehicle_brand_id=)` sonrası bileşen yeniden
   * mount olur; açık kategori/marka panelini URL’den geri yükle (seri/kasa seçmeye devam).
   */
  useEffect(() => {
    if (pathname !== "/") return;
    const cid = searchParams.get("category_id");
    const bid = searchParams.get("vehicle_brand_id");
    const mid = searchParams.get("vehicle_brand_model_id");
    const bsid = searchParams.get("body_style_id");
    const eid = searchParams.get("engine_id");
    const pkid = searchParams.get("vehicle_engine_package_id");
    if (cid) {
      setCategoryId(cid);
      setExpandedCategoryId(cid);
    }
    if (bid) {
      setBrandId(bid);
      setExpandedBrandId(bid);
    }
    if (mid) {
      setModelId(mid);
    }
    if (bsid) {
      setBodyStyleId(bsid);
    }
    if (eid) {
      setEngineId(eid);
    }
    if (pkid) {
      setPackageId(pkid);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const m = await fetchApprovedListingCountsByField(
        supabase,
        "category_id"
      );
      if (!cancelled) setCategoryCounts(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!categoryId) {
      setBrandCounts(new Map());
      return;
    }
    let cancelled = false;
    void (async () => {
      const m = await fetchApprovedListingCountsByField(
        supabase,
        "vehicle_brand_id",
        { categoryId }
      );
      if (!cancelled) setBrandCounts(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId, supabase]);

  useEffect(() => {
    if (!categoryId || !brandId || expandedBrandId !== brandId) {
      setModelNameCounts(new Map());
      return;
    }
    let cancelled = false;
    void (async () => {
      const m = await fetchApprovedListingCountsByVehicleModel(supabase, {
        categoryId,
        vehicleBrandId: brandId,
      });
      if (!cancelled) setModelNameCounts(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId, brandId, expandedBrandId, supabase]);

  useEffect(() => {
    if (!categoryId || !brandId || expandedBrandId !== brandId) {
      setSeriesIdCounts(new Map());
      return;
    }
    let cancelled = false;
    void (async () => {
      const m = await fetchApprovedListingCountsByVehicleBrandModelId(
        supabase,
        {
          categoryId,
          vehicleBrandId: brandId,
        }
      );
      if (!cancelled) setSeriesIdCounts(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId, brandId, expandedBrandId, supabase]);

  useEffect(() => {
    if (!categoryId) {
      setBrands([]);
      setLoadingBrands(false);
      return;
    }
    let cancelled = false;
    setLoadingBrands(true);
    void (async () => {
      const list = await fetchBrandsByCategory(supabase, categoryId);
      if (!cancelled) {
        setBrands(list);
        setLoadingBrands(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId, supabase]);

  useEffect(() => {
    if (!brandId) {
      setSelectableModels([]);
      return;
    }
    setSelectableModels([]);
    let cancelled = false;
    const requestedBrand = brandId;
    void (async () => {
      const list = await fetchSelectableBrandModels(supabase, requestedBrand);
      if (cancelled) return;
      if (brandIdRef.current !== requestedBrand) return;
      setSelectableModels(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId, supabase]);

  useEffect(() => {
    if (!modelId) {
      setBodyStyles([]);
      setLoadingBodyStyles(false);
      return;
    }
    setBodyStyles([]);
    setLoadingBodyStyles(true);
    let cancelled = false;
    const requestedModel = modelId;
    void (async () => {
      const list = await fetchBodyStylesForModel(supabase, requestedModel);
      if (cancelled) return;
      if (modelIdRef.current !== requestedModel) return;
      setBodyStyles(list);
      setLoadingBodyStyles(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [modelId, supabase]);

  useEffect(() => {
    if (!bodyStyleId) {
      setEngines([]);
      setLoadingEngines(false);
      return;
    }
    setEngines([]);
    setLoadingEngines(true);
    let cancelled = false;
    const requestedBody = bodyStyleId;
    void (async () => {
      const list = await fetchEnginesForBodyStyle(supabase, requestedBody);
      if (cancelled) return;
      if (bodyStyleIdRef.current !== requestedBody) return;
      setEngines(list);
      setLoadingEngines(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [bodyStyleId, supabase]);

  useEffect(() => {
    if (!engineId) {
      setPackages([]);
      setLoadingPackages(false);
      return;
    }
    setPackages([]);
    setLoadingPackages(true);
    let cancelled = false;
    const requestedEngine = engineId;
    void (async () => {
      const list = await fetchPackagesForEngine(supabase, requestedEngine);
      if (cancelled) return;
      if (engineIdRef.current !== requestedEngine) return;
      setPackages(list);
      setLoadingPackages(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [engineId, supabase]);

  const resetBelowCategory = useCallback(() => {
    setBrandId("");
    setExpandedBrandId(null);
    setModelId("");
    setBodyStyleId("");
    setEngineId("");
    setPackageId("");
  }, []);

  const resetBelowBrand = useCallback(() => {
    setModelId("");
    setBodyStyleId("");
    setEngineId("");
    setPackageId("");
  }, []);

  const resetBelowModel = useCallback(() => {
    setBodyStyleId("");
    setEngineId("");
    setPackageId("");
  }, []);

  const resetBelowBody = useCallback(() => {
    setEngineId("");
    setPackageId("");
  }, []);

  const resetBelowEngine = useCallback(() => {
    setPackageId("");
  }, []);

  type NavPatch = Partial<{
    categoryId: string;
    brandId: string;
    modelId: string;
    bodyStyleId: string;
    engineId: string;
    packageId: string;
  }>;

  const navigateToListings = useCallback(
    (patch?: NavPatch) => {
      const cid = patch?.categoryId ?? categoryId;
      const bid = patch?.brandId ?? brandId;
      const mid = patch?.modelId !== undefined ? patch.modelId : modelId;
      const bsid =
        patch?.bodyStyleId !== undefined ? patch.bodyStyleId : bodyStyleId;
      const eid = patch?.engineId !== undefined ? patch.engineId : engineId;
      const pkid =
        patch?.packageId !== undefined ? patch.packageId : packageId;

      const p = new URLSearchParams();
      if (cid) p.set("category_id", cid);
      if (bid) p.set("vehicle_brand_id", bid);

      const model = allModelsForNav.find((m) => m.id === mid);
      if (mid) {
        p.set("vehicle_brand_model_id", mid);
        const modelLabel = (model?.name ?? model?.code ?? "").trim();
        if (modelLabel) p.set("vehicle_model", modelLabel);
      }

      const bs = bodyStyles.find((x) => x.id === bsid);
      if (bsid) p.set("body_style_id", bsid);
      if (bs?.name?.trim()) p.set("body_type", bs.name.trim());

      if (eid) p.set("engine_id", eid);

      if (pkid) p.set("vehicle_engine_package_id", pkid);

      const qs = p.toString();
      router.push(qs ? `/?${qs}` : "/");
      onNavigate?.();
    },
    [
      categoryId,
      brandId,
      modelId,
      bodyStyleId,
      engineId,
      packageId,
      allModelsForNav,
      bodyStyles,
      engines,
      packages,
      router,
      onNavigate,
    ]
  );

  const selectedCategory = categorySlots.find((c) => c.id === categoryId);
  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedModel = allModelsForNav.find((m) => m.id === modelId);

  return (
    <div className={cascadeRootClass(fillColumn, compact)}>
      {categoryId && selectedCategory ? (
        <>
          <button
            type="button"
            onClick={() => {
              setCategoryId("");
              setExpandedCategoryId(null);
              resetBelowCategory();
              router.push("/");
              onNavigate?.();
            }}
            className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <span className="text-base">←</span>
            <span>Geri</span>
          </button>
          {label(selectedCategory.label, compact)}
        </>
      ) : (
        label("Kategori", compact)
      )}
      
      {categorySlots.length === 0 ? (
        <p className="text-xs text-zinc-500">
          Kategori listesi boş (Supabase `categories` tablosu).
        </p>
      ) : !categoryId ? (
        <ul className={cascadeListClass(fillColumn, compact)}>
          {categorySlots.map((slot) => {
            const categoryOpen = expandedCategoryId === slot.id;
            return (
              <li key={slot.id} className="min-w-0">
                <button
                  type="button"
                  aria-expanded={categoryOpen}
                  onClick={() => {
                    if (expandedCategoryId === slot.id) {
                      setExpandedCategoryId(null);
                      setCategoryId("");
                      resetBelowCategory();
                    } else {
                      setExpandedCategoryId(slot.id);
                      setCategoryId(slot.id);
                      resetBelowCategory();
                    }
                  }}
                  className={categoryListRowClass(categoryOpen, compact)}
                >
                  <span
                    className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded ${
                      compact ? "h-5 w-5" : "h-6 w-6"
                    }`}
                  >
                    <FallbackImg
                      primary={slot.icon}
                      fallback={categoryIconFallbackUrl()}
                      className={
                        compact ? "h-5 w-5 object-contain" : "h-6 w-6 object-contain"
                      }
                      placeholder={
                        <span className="text-[8px] font-bold text-zinc-500">
                          {slot.label.slice(0, 2).toUpperCase()}
                        </span>
                      }
                    />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-left">
                    {slot.label}
                  </span>
                  {listingCountBadge(categoryCounts.get(slot.id) ?? 0, compact)}
                  <span
                    className={
                      compact
                        ? "shrink-0 text-[9px] text-zinc-400"
                        : "shrink-0 text-[10px] text-zinc-400"
                    }
                    aria-hidden
                  >
                    {categoryOpen ? "▼" : "▶"}
                  </span>
                </button>

                {categoryOpen && !categoryId ? (
                  <div
                    className={
                      compact
                        ? "mt-1 rounded-md border border-zinc-200 bg-zinc-50/90 p-1.5 shadow-sm"
                        : "mt-1.5 rounded-lg border border-zinc-200 bg-zinc-50/90 p-2 shadow-sm"
                    }
                    id={`category-brands-${slot.id}`}
                  >
                    {sectionTitle("Marka")}
                    {loadingBrands ? (
                      <p className="mb-2 text-[11px] text-zinc-500">
                        Markalar yükleniyor…
                      </p>
                    ) : brands.length === 0 ? (
                      <p className="mb-2 text-[11px] text-zinc-500">
                        Bu kategoride marka bulunamadı.
                      </p>
                    ) : (
                      <ul
                        className={
                          compact ? "flex flex-col gap-0.5" : "flex flex-col gap-1"
                        }
                      >
                        {brands.map((b) => {
              const active = brandId === b.id;
              const panelOpen = expandedBrandId === b.id;
              const brandHint = [b.name, b.code].filter(Boolean).join(" ") || null;
              const carLogo = getBrandLogoUrl(b.name ?? null, b.code ?? null);
              const motoLogo = isMotoCategory
                ? getMotorLogoUrl(b.name ?? null, b.code ?? null, brandHint)
                : null;
              const logoPrimary = isMotoCategory ? (motoLogo ?? carLogo) : carLogo;
              const logoFallback =
                isMotoCategory && motoLogo ? carLogo : null;
              const title = b.name ?? b.code ?? b.id;

              return (
                <li key={b.id} className="min-w-0">
                  <button
                    type="button"
                    title={title}
                    onClick={() => {
                      if (brandId !== b.id) {
                        setBrandId(b.id);
                        resetBelowBrand();
                        setExpandedBrandId(b.id);
                        /** Sayfa yenileme yok — önce modeller/seriler açılsın; filtre seri veya “Tümünü göster”de. */
                      } else {
                        setExpandedBrandId((prev) =>
                          prev === b.id ? null : b.id
                        );
                      }
                    }}
                    className={brandListRowClass(active, compact)}
                  >
                    <span
                      className={`flex shrink-0 items-center justify-center rounded ${
                        compact ? "h-6 w-6" : "h-7 w-7"
                      } ${active ? "bg-white" : "bg-white/90"}`}
                    >
                      <FallbackImg
                        primary={logoPrimary}
                        fallback={logoFallback}
                        className={
                          compact ? "h-5 w-5 object-contain" : "h-6 w-6 object-contain"
                        }
                        placeholder={
                          <span className="text-[9px] font-bold text-zinc-400">
                            {(title.slice(0, 3) || "?").toUpperCase()}
                          </span>
                        }
                      />
                    </span>
                    <span
                      className={
                        compact
                          ? `min-w-0 flex-1 truncate text-left text-[10px] font-semibold leading-tight ${
                              active ? "text-zinc-900" : "text-zinc-800"
                            }`
                          : `min-w-0 flex-1 truncate text-left text-[11px] font-semibold leading-tight ${
                              active ? "text-zinc-900" : "text-zinc-800"
                            }`
                      }
                    >
                      {title}
                    </span>
                    {listingCountBadge(brandCounts.get(b.id) ?? 0, compact)}
                    <span
                      className={
                        compact
                          ? "shrink-0 text-[8px] text-zinc-400"
                          : "shrink-0 text-[9px] text-zinc-400"
                      }
                      aria-hidden
                    >
                      {panelOpen ? "▼" : "▶"}
                    </span>
                  </button>
                </li>
            );
          })}
                      </ul>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : categoryId ? (
        <div
          className={
            compact
              ? "min-h-[calc(100vh-16rem)] overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50/90 p-1.5 shadow-sm"
              : "min-h-[calc(100vh-16rem)] overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/90 p-2 shadow-sm"
          }
        >
          {brandId && selectedBrand ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setBrandId("");
                  setExpandedBrandId(null);
                  resetBelowBrand();
                  const p = new URLSearchParams();
                  if (categoryId) p.set("category_id", categoryId);
                  router.push(`/?${p.toString()}`);
                  onNavigate?.();
                }}
                className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <span className="text-base">←</span>
                <span>Geri</span>
              </button>
              {sectionTitle(selectedBrand.name ?? selectedBrand.code ?? "Marka")}
            </>
          ) : (
            sectionTitle("Marka")
          )}
          
          {loadingBrands ? (
            <p className="mb-2 text-[11px] text-zinc-500">
              Markalar yükleniyor…
            </p>
          ) : brands.length === 0 ? (
            <p className="mb-2 text-[11px] text-zinc-500">
              Bu kategoride marka bulunamadı.
            </p>
          ) : !brandId ? (
            <ul
              className={
                compact ? "flex flex-col gap-0.5" : "flex flex-col gap-1"
              }
            >
              {brands.map((b) => {
                const active = brandId === b.id;
                const brandHint = [b.name, b.code].filter(Boolean).join(" ") || null;
                const carLogo = getBrandLogoUrl(b.name ?? null, b.code ?? null);
                const motoLogo = isMotoCategory
                  ? getMotorLogoUrl(b.name ?? null, b.code ?? null, brandHint)
                  : null;
                const logoPrimary = isMotoCategory ? (motoLogo ?? carLogo) : carLogo;
                const logoFallback =
                  isMotoCategory && motoLogo ? carLogo : null;
                const title = b.name ?? b.code ?? b.id;

                return (
                  <li key={b.id} className="min-w-0">
                    <button
                      type="button"
                      title={title}
                      onClick={() => {
                        setBrandId(b.id);
                        resetBelowBrand();
                        setExpandedBrandId(b.id);
                      }}
                      className={brandListRowClass(active, compact)}
                    >
                      <span
                        className={`flex shrink-0 items-center justify-center rounded ${
                          compact ? "h-6 w-6" : "h-7 w-7"
                        } ${active ? "bg-white" : "bg-white/90"}`}
                      >
                        <FallbackImg
                          primary={logoPrimary}
                          fallback={logoFallback}
                          className={
                            compact ? "h-5 w-5 object-contain" : "h-6 w-6 object-contain"
                          }
                          placeholder={
                            <span className="text-[9px] font-bold text-zinc-400">
                              {(title.slice(0, 3) || "?").toUpperCase()}
                            </span>
                          }
                        />
                      </span>
                      <span
                        className={
                          compact
                            ? `min-w-0 flex-1 truncate text-left text-[10px] font-semibold leading-tight ${
                                active ? "text-zinc-900" : "text-zinc-800"
                              }`
                            : `min-w-0 flex-1 truncate text-left text-[11px] font-semibold leading-tight ${
                                active ? "text-zinc-900" : "text-zinc-800"
                              }`
                        }
                      >
                        {title}
                      </span>
                      {listingCountBadge(brandCounts.get(b.id) ?? 0, compact)}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
          
          {brandId && selectedBrand ? (
            <div className="mt-2 space-y-3">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1.5 text-[11px] font-semibold text-zinc-800 hover:border-[#ffcc00] hover:bg-amber-50/60"
                onClick={() => {
                  setModelId("");
                  resetBelowModel();
                  navigateToListings({
                    modelId: "",
                    bodyStyleId: "",
                    engineId: "",
                    packageId: "",
                  });
                }}
              >
                <span>Tüm {selectedBrand.name ?? selectedBrand.code} ilanları</span>
                {listingCountBadge(brandCounts.get(brandId) ?? 0, compact)}
              </button>

              {modelId && selectedModel ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setModelId("");
                      resetBelowModel();
                    }}
                    className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <span className="text-base">←</span>
                    <span>Geri</span>
                  </button>
                  {sectionTitle(rowLabel(selectedModel))}
                </>
              ) : (
                sectionTitle("Model")
              )}
              
              {selectableModels.length === 0 ? (
                <p className="text-[11px] text-zinc-500">Model yükleniyor…</p>
              ) : !modelId ? (
                <ul className="flex flex-col gap-1">
                  {selectableModels.map((m) => {
                    const mActive = modelId === m.id;
                    const mCnt =
                      seriesIdCounts.get(m.id) ??
                      modelNameCounts.get(
                        normalizeListingModelKey(rowLabel(m))
                      ) ??
                      0;
                    return (
                      <li key={m.id} className="min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            setModelId(m.id);
                            resetBelowModel();
                          }}
                          className={`flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] font-semibold transition ${
                            mActive
                              ? "border-amber-500 bg-[#ffcc00] text-zinc-900 ring-1 ring-amber-400/70"
                              : "border-zinc-200 bg-white text-zinc-800 hover:border-amber-300 hover:bg-amber-50/50"
                          }`}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {rowLabel(m)}
                          </span>
                          {mCnt > 0 ? listingCountBadge(mCnt, compact) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {modelId && selectableModels.length > 0 ? (
                <div className="space-y-3 border-t border-zinc-100 pt-3">
                  {sectionTitle("Kasa")}
                  {loadingBodyStyles ? (
                    <p className="text-[11px] text-zinc-500">Yükleniyor…</p>
                  ) : bodyStyles.length === 0 ? (
                    <button
                      type="button"
                      className="w-full rounded-md border border-amber-500 bg-[#ffcc00] px-2 py-2 text-[11px] font-bold text-zinc-900 hover:bg-amber-300"
                      onClick={() => navigateToListings({ packageId: "" })}
                    >
                      İlanları göster
                    </button>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {bodyStyles.map((bs) => {
                        const bsActive = bodyStyleId === bs.id;
                        return (
                          <li key={bs.id} className="min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                setBodyStyleId(bs.id);
                                resetBelowBody();
                              }}
                              className={`flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] font-semibold transition ${
                                bsActive
                                  ? "border-amber-500 bg-[#ffcc00] text-zinc-900 ring-1 ring-amber-400/70"
                                  : "border-zinc-200 bg-white text-zinc-800 hover:border-amber-300 hover:bg-amber-50/50"
                              }`}
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {rowLabel(bs)}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {bodyStyleId && bodyStyles.length > 0 ? (
                    <div className="space-y-3 border-t border-zinc-100 pt-3">
                      {sectionTitle("Motor")}
                      {loadingEngines ? (
                        <p className="text-[11px] text-zinc-500">Yükleniyor…</p>
                      ) : engines.length === 0 ? (
                        <button
                          type="button"
                          className="w-full rounded-md border border-amber-500 bg-[#ffcc00] px-2 py-2 text-[11px] font-bold text-zinc-900 hover:bg-amber-300"
                          onClick={() =>
                            navigateToListings({ engineId: "", packageId: "" })
                          }
                        >
                          İlanları göster
                        </button>
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {engines.map((eng) => {
                            const engActive = engineId === eng.id;
                            return (
                              <li key={eng.id} className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEngineId(eng.id);
                                    resetBelowEngine();
                                  }}
                                  className={`flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] font-semibold transition ${
                                    engActive
                                      ? "border-amber-500 bg-[#ffcc00] text-zinc-900 ring-1 ring-amber-400/70"
                                      : "border-zinc-200 bg-white text-zinc-800 hover:border-amber-300 hover:bg-amber-50/50"
                                  }`}
                                >
                                  <span className="min-w-0 flex-1 truncate">
                                    {rowLabel(eng)}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {engineId && engines.length > 0 ? (
                        <div className="space-y-3 border-t border-zinc-100 pt-3">
                          {sectionTitle("Paket")}
                          {loadingPackages ? (
                            <p className="text-[11px] text-zinc-500">Yükleniyor…</p>
                          ) : packages.length === 0 ? (
                            <button
                              type="button"
                              className="w-full rounded-md border border-amber-500 bg-[#ffcc00] px-2 py-2 text-[11px] font-bold text-zinc-900 hover:bg-amber-300"
                              onClick={() =>
                                navigateToListings({ packageId: "" })
                              }
                            >
                              İlanları göster
                            </button>
                          ) : (
                            <ul className="flex flex-col gap-1">
                              {packages.map((pk) => {
                                const pkActive = packageId === pk.id;
                                return (
                                  <li key={pk.id} className="min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPackageId(pk.id);
                                        navigateToListings({ packageId: pk.id });
                                      }}
                                      className={`flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] font-semibold transition ${
                                        pkActive
                                          ? "border-amber-500 bg-[#ffcc00] text-zinc-900 ring-1 ring-amber-400/70"
                                          : "border-zinc-200 bg-white text-zinc-800 hover:border-amber-300 hover:bg-amber-50/50"
                                      }`}
                                    >
                                      <span className="min-w-0 flex-1 truncate">
                                        {rowLabel(pk)}
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      ) : null}

                      {modelId && bodyStyles.length > 0 && !loadingBodyStyles && !packageId ? (
                        <button
                          type="button"
                          className="w-full rounded-md border border-amber-500 bg-[#ffcc00] px-2 py-2 text-[11px] font-bold text-zinc-900 hover:bg-amber-300"
                          onClick={() => navigateToListings()}
                        >
                          İlanları göster
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function VehicleCascadeSidebar({
  categories,
  onNavigate,
  fillColumn = false,
  compact = false,
}: {
  categories: CategoryRow[];
  onNavigate?: () => void;
  fillColumn?: boolean;
  compact?: boolean;
}) {
  const isClient = useIsClient();
  if (!isClient) {
    return (
      <VehicleCascadeSidebarPlaceholder fillColumn={fillColumn} compact={compact} />
    );
  }
  return (
    <VehicleCascadeSidebarInner
      categories={categories}
      onNavigate={onNavigate}
      fillColumn={fillColumn}
      compact={compact}
    />
  );
}
