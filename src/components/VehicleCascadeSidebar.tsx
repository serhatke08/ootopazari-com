"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FallbackImg } from "@/components/FallbackImg";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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
  fetchBrandModelsHierarchy,
  fetchBodyStylesForModel,
  fetchChildBrandModels,
  fetchEnginesForBodyStyle,
  fetchPackagesForEngine,
} from "@/lib/vehicle-hierarchy";

const SELECT_CLASS =
  "mb-1 block w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm focus:border-[#ffcc00] focus:outline-none focus:ring-1 focus:ring-amber-300";
const SELECT_CLASS_COMPACT =
  "mb-1 block w-full rounded border border-zinc-300 bg-white px-1.5 py-1 text-[11px] leading-tight text-zinc-900 shadow-sm focus:border-[#ffcc00] focus:outline-none focus:ring-1 focus:ring-amber-300";

function categoryIconUrl(order: number): string {
  return `/menu/${encodeURIComponent("kategori icon")}/${order}.png`;
}

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

function modelListRowClass(active: boolean, compact?: boolean) {
  const ring = compact ? "ring-1 ring-amber-400/70" : "ring-2 ring-amber-400/70";
  const base = compact
    ? "flex w-full min-w-0 items-center justify-between gap-1 rounded-md border px-1.5 py-0.5 text-left text-[10px] font-semibold leading-tight transition"
    : "flex w-full min-w-0 items-center justify-between gap-1 rounded-md border px-1.5 py-1 text-left text-[11px] font-semibold leading-tight transition";
  return [
    base,
    active
      ? `border-amber-500 bg-[#ffcc00] text-zinc-900 shadow-sm ${ring}`
      : "border-zinc-300 bg-white text-zinc-800 hover:border-[#ffcc00] hover:bg-amber-50/60",
  ].join(" ");
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

export function VehicleCascadeSidebar({
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
  const selectClass = compact ? SELECT_CLASS_COMPACT : SELECT_CLASS;

  const categorySlots = useMemo(() => {
    return [...categories]
      .sort(
        (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999)
      )
      .map((c, i) => ({
        id: c.id,
        label: (c.name ?? c.code ?? "Kategori").trim(),
        icon: categoryIconUrl(i + 1),
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
  /** İki kademeli: üst = modeller (parent_id null), alt = seriler */
  const [hierarchyHierarchical, setHierarchyHierarchical] = useState(false);
  const [parentModels, setParentModels] = useState<IdNameRow[]>([]);
  const [expandedParentModelId, setExpandedParentModelId] = useState<
    string | null
  >(null);
  const [seriesModels, setSeriesModels] = useState<IdNameRow[]>([]);
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

  const allModelsForNav = useMemo(() => {
    const m = new Map<string, IdNameRow>();
    for (const x of parentModels) m.set(x.id, x);
    for (const x of seriesModels) m.set(x.id, x);
    return [...m.values()];
  }, [parentModels, seriesModels]);

  const brandIdRef = useRef(brandId);
  const modelIdRef = useRef(modelId);
  const bodyStyleIdRef = useRef(bodyStyleId);
  const engineIdRef = useRef(engineId);
  brandIdRef.current = brandId;
  modelIdRef.current = modelId;
  bodyStyleIdRef.current = bodyStyleId;
  engineIdRef.current = engineId;

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
    if (cid) {
      setCategoryId(cid);
      setExpandedCategoryId(cid);
    }
    if (bid) {
      setBrandId(bid);
      setExpandedBrandId(bid);
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
      setParentModels([]);
      setHierarchyHierarchical(false);
      setExpandedParentModelId(null);
      setSeriesModels([]);
      return;
    }
    setParentModels([]);
    setExpandedParentModelId(null);
    setSeriesModels([]);
    let cancelled = false;
    const requestedBrand = brandId;
    void (async () => {
      const r = await fetchBrandModelsHierarchy(supabase, requestedBrand);
      if (cancelled) return;
      if (brandIdRef.current !== requestedBrand) return;
      setHierarchyHierarchical(r.hierarchical);
      setParentModels(r.parents);
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId, supabase]);

  useEffect(() => {
    if (!expandedParentModelId || !hierarchyHierarchical) {
      setSeriesModels([]);
      return;
    }
    let cancelled = false;
    const pid = expandedParentModelId;
    void (async () => {
      let list = await fetchChildBrandModels(supabase, pid);
      if (cancelled) return;
      if (list.length === 0) {
        const p = parentModels.find((x) => x.id === pid);
        if (p) list = [p];
      }
      setSeriesModels(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [expandedParentModelId, hierarchyHierarchical, parentModels, supabase]);

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
    setExpandedParentModelId(null);
    setSeriesModels([]);
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
        const label = (model?.name ?? model?.code ?? "").trim();
        if (label) p.set("vehicle_model", label);
      }

      const extra: string[] = [];
      const bs = bodyStyles.find((x) => x.id === bsid);
      if (bs?.name?.trim()) extra.push(bs.name.trim());
      const eng = engines.find((x) => x.id === eid);
      if (eng?.name?.trim()) extra.push(eng.name.trim());
      const pk = packages.find((x) => x.id === pkid);
      if (pk?.name?.trim()) extra.push(pk.name.trim());
      if (extra.length) p.set("q", extra.join(" "));

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

  return (
    <div
      className={
        fillColumn
          ? compact
            ? "flex w-full min-h-0 flex-col gap-1.5"
            : "flex w-full min-h-0 flex-col gap-2.5"
          : compact
            ? "w-full space-y-1.5"
            : "w-full space-y-2"
      }
    >
      {label("Kategori", compact)}
      {categorySlots.length === 0 ? (
        <p className="text-xs text-zinc-500">
          Kategori listesi boş (Supabase `categories` tablosu).
        </p>
      ) : (
        <ul
          className={
            fillColumn
              ? compact
                ? "flex flex-col gap-2"
                : "flex flex-col gap-3"
              : compact
                ? "flex flex-col gap-0.5"
                : "flex flex-col gap-1"
          }
        >
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
                    className={`relative shrink-0 overflow-hidden rounded ${
                      compact ? "h-5 w-5" : "h-6 w-6"
                    }`}
                  >
                    <Image
                      src={slot.icon}
                      alt=""
                      fill
                      className="object-contain"
                      sizes={compact ? "20px" : "24px"}
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

                {categoryOpen ? (
                  <div
                    className={
                      compact
                        ? "mt-1 rounded-md border border-zinc-200 bg-zinc-50/90 p-1.5 shadow-sm"
                        : "mt-1.5 rounded-lg border border-zinc-200 bg-zinc-50/90 p-2 shadow-sm"
                    }
                    id={`category-brands-${slot.id}`}
                  >
                    {label("Marka", compact)}
                    {!categoryId ? (
                      <p className="text-xs text-zinc-500">
                        Kategori seçilemedi; tekrar deneyin.
                      </p>
                    ) : loadingBrands ? (
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

                  {panelOpen && brandId === b.id ? (
                    <div className="mt-1.5 space-y-1.5 border-l-2 border-amber-200/90 pl-2">
                      <div>
                        <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
                          {hierarchyHierarchical ? "Modeller" : "Seriler"}
                        </span>
                        <ul className="flex flex-col gap-0.5">
                          <li className="min-w-0">
                            <button
                              type="button"
                              title="Bu markanın tüm ilanları (seri filtresiz)"
                              onClick={() => {
                                setModelId("");
                                setExpandedParentModelId(null);
                                setSeriesModels([]);
                                resetBelowModel();
                              }}
                              className={modelListRowClass(!modelId, compact)}
                            >
                              <span className="line-clamp-2 min-w-0 flex-1 text-left">
                                Tümünü göster
                              </span>
                              {listingCountBadge(
                                brandCounts.get(b.id) ?? 0,
                                compact
                              )}
                            </button>
                          </li>
                          {hierarchyHierarchical
                            ? parentModels.map((pm) => {
                                const pmTitle = pm.name ?? pm.code ?? pm.id;
                                const panelOpen = expandedParentModelId === pm.id;
                                const childSum =
                                  panelOpen && seriesModels.length > 0
                                    ? seriesModels.reduce((acc, s) => {
                                        const n =
                                          seriesIdCounts.get(s.id) ??
                                          modelNameCounts.get(
                                            normalizeListingModelKey(
                                              s.code ?? s.name ?? ""
                                            )
                                          ) ??
                                          0;
                                        return acc + n;
                                      }, 0)
                                    : null;
                                return (
                                  <li key={pm.id} className="min-w-0">
                                    <button
                                      type="button"
                                      title={pmTitle}
                                      onClick={() => {
                                        setExpandedParentModelId((prev) =>
                                          prev === pm.id ? null : pm.id
                                        );
                                        setModelId("");
                                        resetBelowModel();
                                      }}
                                      className={modelListRowClass(panelOpen, compact)}
                                    >
                                      <span className="line-clamp-2 min-w-0 flex-1 text-left">
                                        {pmTitle}
                                      </span>
                                      {childSum != null ? (
                                        listingCountBadge(childSum, compact)
                                      ) : (
                                        <span
                                          className={
                                            compact
                                              ? "shrink-0 text-[9px] text-zinc-400"
                                              : "shrink-0 text-[10px] text-zinc-400"
                                          }
                                        >
                                          —
                                        </span>
                                      )}
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
                                    {panelOpen ? (
                                      <div className="mt-1 space-y-0.5 border-l border-zinc-200 pl-2">
                                        <span className="mb-0.5 block text-[8px] font-semibold uppercase tracking-wide text-zinc-500">
                                          Seriler
                                        </span>
                                        <ul className="flex flex-col gap-0.5">
                                          {seriesModels.map((s) => {
                                            const sLabel =
                                              s.code?.trim() ||
                                              s.name?.trim() ||
                                              s.id;
                                            const sActive = modelId === s.id;
                                            const sCnt =
                                              seriesIdCounts.get(s.id) ??
                                              modelNameCounts.get(
                                                normalizeListingModelKey(
                                                  s.code ?? s.name ?? ""
                                                )
                                              ) ??
                                              0;
                                            return (
                                              <li key={s.id} className="min-w-0">
                                                <button
                                                  type="button"
                                                  title={sLabel}
                                                  onClick={() => {
                                                    setModelId(s.id);
                                                    resetBelowModel();
                                                  }}
                                                  className={modelListRowClass(
                                                    sActive,
                                                    compact
                                                  )}
                                                >
                                                  <span className="line-clamp-2 min-w-0 flex-1 text-left">
                                                    {sLabel}
                                                  </span>
                                                  {listingCountBadge(sCnt, compact)}
                                                </button>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    ) : null}
                                  </li>
                                );
                              })
                            : parentModels.map((m) => {
                                const mTitle = m.name ?? m.code ?? m.id;
                                const mLabel =
                                  m.code?.trim() || m.name?.trim() || m.id;
                                const mActive = modelId === m.id;
                                const mCnt =
                                  seriesIdCounts.get(m.id) ??
                                  modelNameCounts.get(
                                    normalizeListingModelKey(mTitle)
                                  ) ??
                                  0;
                                return (
                                  <li key={m.id} className="min-w-0">
                                    <button
                                      type="button"
                                      title={mTitle}
                                      onClick={() => {
                                        setModelId(m.id);
                                        resetBelowModel();
                                      }}
                                      className={modelListRowClass(mActive, compact)}
                                    >
                                      <span className="line-clamp-2 min-w-0 flex-1 text-left">
                                        {mLabel}
                                      </span>
                                      {listingCountBadge(mCnt, compact)}
                                    </button>
                                  </li>
                                );
                              })}
                        </ul>
                        {parentModels.length === 0 ? (
                          <p className="mt-1 text-[10px] leading-snug text-zinc-500">
                            Bu marka için veritabanında model satırı yok; üstteki
                            seçenekle yine de markaya göre gidebilirsiniz.
                          </p>
                        ) : null}
                      </div>

                      {modelId ? (
                        <div className="mt-2 space-y-2 border-t border-amber-200/90 pt-2">
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                            <div className="min-w-0 border-r border-zinc-200 pr-2">
                              {label("Kasa / gövde", compact)}
                              <select
                                className={selectClass}
                                value={bodyStyleId}
                                disabled={loadingBodyStyles}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setBodyStyleId(v);
                                  resetBelowBody();
                                }}
                              >
                                <option value="">
                                  {loadingBodyStyles
                                    ? "Yükleniyor…"
                                    : "Kasa seçin"}
                                </option>
                                {bodyStyles.map((x) => (
                                  <option key={x.id} value={x.id}>
                                    {x.name ?? x.code ?? x.id}
                                  </option>
                                ))}
                              </select>
                              {!loadingBodyStyles &&
                              bodyStyles.length === 0 ? (
                                <p className="mt-0.5 text-[9px] leading-snug text-zinc-500">
                                  Bu model için kasa kaydı yok.
                                </p>
                              ) : null}
                            </div>
                            <div className="min-w-0 pl-0.5">
                              {label("Motor", compact)}
                              <select
                                className={selectClass}
                                value={engineId}
                                disabled={
                                  !bodyStyleId ||
                                  loadingEngines ||
                                  (!loadingEngines && engines.length === 0)
                                }
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setEngineId(v);
                                  resetBelowEngine();
                                }}
                              >
                                <option value="">
                                  {!bodyStyleId
                                    ? "Önce kasa seçin"
                                    : loadingEngines
                                      ? "Yükleniyor…"
                                      : engines.length === 0
                                        ? "Motor yok"
                                        : "Motor seçin"}
                                </option>
                                {engines.map((x) => (
                                  <option key={x.id} value={x.id}>
                                    {x.name ?? x.code ?? x.id}
                                  </option>
                                ))}
                              </select>
                              {bodyStyleId &&
                              !loadingEngines &&
                              engines.length === 0 ? (
                                <p className="mt-0.5 text-[9px] leading-snug text-zinc-500">
                                  Bu kasa için motor kaydı yok.
                                </p>
                              ) : null}
                            </div>
                          </div>

                          {engineId ? (
                            <div className="w-full min-w-0 rounded-md border border-zinc-200 bg-white/80 p-1.5">
                              {label("Paket", compact)}
                              {loadingPackages ? (
                                <p className="text-[10px] text-zinc-500">
                                  Paketler yükleniyor…
                                </p>
                              ) : packages.length > 0 ? (
                                <select
                                  className={selectClass}
                                  value={packageId}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setPackageId(v);
                                    if (v) {
                                      navigateToListings({ packageId: v });
                                    }
                                  }}
                                >
                                  <option value="">Paket seçin</option>
                                  {packages.map((x) => (
                                    <option key={x.id} value={x.id}>
                                      {x.name ?? x.code ?? x.id}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <button
                                  type="button"
                                  className={
                                    compact
                                      ? "mb-1 w-full rounded-md border border-amber-500 bg-[#ffcc00] px-2 py-1.5 text-[11px] font-bold text-zinc-900 shadow-sm hover:bg-amber-300"
                                      : "mb-1 w-full rounded-lg border border-amber-500 bg-[#ffcc00] px-2.5 py-2 text-xs font-bold text-zinc-900 shadow-sm hover:bg-amber-300"
                                  }
                                  onClick={() =>
                                    navigateToListings({ packageId: "" })
                                  }
                                >
                                  İlanları göster
                                </button>
                              )}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
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
      )}
    </div>
  );
}
