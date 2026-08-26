"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { CategoryRow } from "@/lib/listings-data";
import type { HomeListingsFeedFilters } from "@/lib/home-listings-feed-types";
import {
  HOME_FILTER_FUELS,
  HOME_FILTER_TRANSMISSIONS,
  countHomeFilterBadges,
  homeFilterRangeError,
  isHiddenFilterBrand,
  isHiddenFilterCategory,
} from "@/lib/home-filter-client";
import { fetchBrandModels, fetchBrandsByCategory } from "@/lib/vehicle-hierarchy";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useIsClient } from "@/hooks/use-is-client";

type Draft = {
  categoryId: string;
  brandIds: string[];
  models: string[];
  minPrice: string;
  maxPrice: string;
  minYear: string;
  maxYear: string;
  minKm: string;
  maxKm: string;
  fuelType: string;
  transmissionType: string;
  hasPhoto: boolean;
  vehiclesOnly: boolean;
};

type Panel = "category" | "brand" | "model" | null;

function parseTrInt(raw: string): number | undefined {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return undefined;
  const n = Number(digits);
  return Number.isFinite(n) ? n : undefined;
}

function formatTrInt(raw: string): string {
  const n = parseTrInt(raw);
  if (n == null) return "";
  return n.toLocaleString("tr-TR");
}

function filtersToDraft(f: HomeListingsFeedFilters): Draft {
  const brandIds = [
    ...new Set(
      [...(f.vehicleBrandIds ?? []), f.vehicleBrandId ?? ""].filter(Boolean)
    ),
  ];
  const models = [
    ...new Set(
      [...(f.vehicleModels ?? []), f.vehicleModel ?? ""]
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
  return {
    categoryId: f.categoryId ?? "",
    brandIds,
    models,
    minPrice: f.minPrice != null ? String(f.minPrice) : "",
    maxPrice: f.maxPrice != null ? String(f.maxPrice) : "",
    minYear: f.minYear != null ? String(f.minYear) : "",
    maxYear: f.maxYear != null ? String(f.maxYear) : "",
    minKm: f.minKm != null ? String(f.minKm) : "",
    maxKm: f.maxKm != null ? String(f.maxKm) : "",
    fuelType: f.fuelType ?? "",
    transmissionType: f.transmissionType ?? "",
    hasPhoto: Boolean(f.hasPhoto),
    vehiclesOnly: Boolean(f.vehiclesOnly),
  };
}

function Chevron() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-zinc-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
        on ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white"
      }`}
      aria-hidden
    >
      {on ? (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      ) : null}
    </span>
  );
}

function FilterRow({
  label,
  value,
  disabled,
  hint,
  onClick,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-3.5 text-left disabled:opacity-45"
    >
      <span className="shrink-0 text-sm font-semibold text-zinc-900">{label}</span>
      <span
        className={`min-w-0 flex-1 truncate text-right text-sm ${
          value ? "font-medium text-zinc-800" : "text-zinc-400"
        }`}
      >
        {disabled ? hint ?? "—" : value || "Seçiniz"}
      </span>
      <Chevron />
    </button>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="border-b border-zinc-100 px-4 py-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-400"
      />
    </div>
  );
}

export function HomeFilterSheet({
  open,
  onClose,
  categories,
  applied,
  onApply,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  categories: CategoryRow[];
  applied: HomeListingsFeedFilters;
  onApply: (next: HomeListingsFeedFilters) => void;
  onReset: () => void;
}) {
  const mounted = useIsClient();
  const [draft, setDraft] = useState<Draft>(() => filtersToDraft(applied));
  const [rangeErr, setRangeErr] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [query, setQuery] = useState("");
  const [brands, setBrands] = useState<
    { id: string; name: string | null; code?: string | null }[]
  >([]);
  const [models, setModels] = useState<
    { id: string; name: string | null; code?: string | null }[]
  >([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  const visibleCategories = useMemo(
    () => categories.filter((c) => !isHiddenFilterCategory(c.code, c.name)),
    [categories]
  );

  useEffect(() => {
    if (open) {
      setDraft(filtersToDraft(applied));
      setRangeErr(null);
      setPanel(null);
      setQuery("");
    }
  }, [open, applied]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (panel) {
        setPanel(null);
        setQuery("");
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, panel]);

  useEffect(() => {
    if (!open || !draft.categoryId) {
      setBrands([]);
      setLoadingBrands(false);
      return;
    }
    let cancelled = false;
    setLoadingBrands(true);
    const supabase = createSupabaseBrowserClient();
    void fetchBrandsByCategory(supabase, draft.categoryId)
      .then((rows) => {
        if (cancelled) return;
        setBrands(rows.filter((b) => !isHiddenFilterBrand(b.code, b.name)));
      })
      .catch(() => {
        if (!cancelled) setBrands([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingBrands(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.categoryId, open]);

  useEffect(() => {
    if (!open || draft.brandIds.length === 0) {
      setModels([]);
      setLoadingModels(false);
      return;
    }
    let cancelled = false;
    setLoadingModels(true);
    const supabase = createSupabaseBrowserClient();
    void Promise.all(draft.brandIds.map((id) => fetchBrandModels(supabase, id)))
      .then((lists) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const merged: { id: string; name: string | null; code?: string | null }[] =
          [];
        for (const list of lists) {
          for (const row of list) {
            const key = (row.name ?? row.code ?? row.id)
              .trim()
              .toLocaleLowerCase("tr");
            if (!key || seen.has(key)) continue;
            seen.add(key);
            merged.push(row);
          }
        }
        setModels(merged);
      })
      .catch(() => {
        if (!cancelled) setModels([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingModels(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.brandIds, open]);

  function setCategory(id: string) {
    setDraft((d) => ({
      ...d,
      categoryId: id,
      brandIds: [],
      models: [],
      vehiclesOnly: id ? true : d.vehiclesOnly,
    }));
  }

  function toggleBrand(id: string) {
    setDraft((d) => {
      const next = d.brandIds.includes(id)
        ? d.brandIds.filter((x) => x !== id)
        : [...d.brandIds, id];
      return { ...d, brandIds: next, models: [] };
    });
  }

  function toggleModel(name: string) {
    setDraft((d) => ({
      ...d,
      models: d.models.includes(name)
        ? d.models.filter((x) => x !== name)
        : [...d.models, name],
    }));
  }

  function closePanel() {
    setPanel(null);
    setQuery("");
  }

  function apply() {
    const minPrice = parseTrInt(draft.minPrice);
    const maxPrice = parseTrInt(draft.maxPrice);
    const minYear = parseTrInt(draft.minYear);
    const maxYear = parseTrInt(draft.maxYear);
    const minKm = parseTrInt(draft.minKm);
    const maxKm = parseTrInt(draft.maxKm);
    const err =
      homeFilterRangeError(minPrice, maxPrice, "Fiyat") ||
      homeFilterRangeError(minYear, maxYear, "Yıl") ||
      homeFilterRangeError(minKm, maxKm, "Km");
    if (err) {
      setRangeErr(err);
      return;
    }
    setRangeErr(null);
    onApply({
      cityId: applied.cityId,
      cityIds: applied.cityIds,
      sort: applied.sort,
      q: applied.q,
      categoryId: draft.categoryId || undefined,
      vehicleBrandId: draft.brandIds[0],
      vehicleBrandIds: draft.brandIds.length > 0 ? draft.brandIds : undefined,
      vehicleModel: draft.models.length === 1 ? draft.models[0] : undefined,
      vehicleModels: draft.models.length > 0 ? draft.models : undefined,
      minPrice,
      maxPrice,
      minYear,
      maxYear,
      minKm,
      maxKm,
      fuelType: draft.fuelType || undefined,
      transmissionType: draft.transmissionType || undefined,
      hasPhoto: draft.hasPhoto || undefined,
      vehiclesOnly: draft.vehiclesOnly || undefined,
    });
  }

  if (!mounted || !open) return null;

  const badge = countHomeFilterBadges({
    categoryId: draft.categoryId || undefined,
    vehicleBrandIds: draft.brandIds,
    vehicleModels: draft.models,
    minPrice: parseTrInt(draft.minPrice),
    maxPrice: parseTrInt(draft.maxPrice),
    minYear: parseTrInt(draft.minYear),
    maxYear: parseTrInt(draft.maxYear),
    minKm: parseTrInt(draft.minKm),
    maxKm: parseTrInt(draft.maxKm),
    fuelType: draft.fuelType || undefined,
    transmissionType: draft.transmissionType || undefined,
    hasPhoto: draft.hasPhoto,
    vehiclesOnly: draft.vehiclesOnly,
  });

  const categoryName =
    visibleCategories.find((c) => c.id === draft.categoryId)?.name ??
    visibleCategories.find((c) => c.id === draft.categoryId)?.code ??
    "";
  const brandNames = brands
    .filter((b) => draft.brandIds.includes(b.id))
    .map((b) => b.name ?? b.code ?? "")
    .filter(Boolean);
  const brandSummary =
    brandNames.length === 0
      ? ""
      : brandNames.length <= 2
        ? brandNames.join(", ")
        : `${brandNames.length} marka`;
  const modelSummary =
    draft.models.length === 0
      ? ""
      : draft.models.length <= 2
        ? draft.models.join(", ")
        : `${draft.models.length} model`;

  const q = query.trim().toLocaleLowerCase("tr");
  const filteredCategories = q
    ? visibleCategories.filter((c) =>
        `${c.name ?? ""} ${c.code ?? ""}`.toLocaleLowerCase("tr").includes(q)
      )
    : visibleCategories;
  const filteredBrands = q
    ? brands.filter((b) =>
        `${b.name ?? ""} ${b.code ?? ""}`.toLocaleLowerCase("tr").includes(q)
      )
    : brands;
  const filteredModels = q
    ? models.filter((m) =>
        `${m.name ?? ""} ${m.code ?? ""}`.toLocaleLowerCase("tr").includes(q)
      )
    : models;

  const panelTitle =
    panel === "category" ? "Kategori" : panel === "brand" ? "Marka" : panel === "model" ? "Model" : "Filtrele";

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Kapat"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-filter-title"
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:max-h-[85dvh] sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 px-3 py-3">
          {panel ? (
            <button
              type="button"
              onClick={closePanel}
              className="rounded-full p-1.5 text-zinc-600 hover:bg-zinc-100"
              aria-label="Geri"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : null}
          <h2 id="home-filter-title" className="min-w-0 flex-1 text-base font-bold text-zinc-900">
            {panel ? panelTitle : `Filtrele${badge > 0 ? ` · ${badge}` : ""}`}
          </h2>
          {panel === "brand" || panel === "model" ? (
            <button
              type="button"
              onClick={closePanel}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              Tamam
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
              aria-label="Kapat"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {panel === "category" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <SearchBox
              value={query}
              onChange={setQuery}
              placeholder="Kategori ara"
            />
            <div className="min-h-0 flex-1 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  setCategory("");
                  closePanel();
                }}
                className="flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-3.5 text-left"
              >
                <Check on={!draft.categoryId} />
                <span className="text-sm font-medium text-zinc-900">Tümü</span>
              </button>
              {filteredCategories.map((c) => {
                const on = draft.categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCategory(on ? "" : c.id);
                      closePanel();
                    }}
                    className="flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-3.5 text-left"
                  >
                    <Check on={on} />
                    <span className="text-sm font-medium text-zinc-900">
                      {c.name ?? c.code ?? "Kategori"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : panel === "brand" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <SearchBox value={query} onChange={setQuery} placeholder="Marka ara" />
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingBrands ? (
                <p className="px-4 py-6 text-sm text-zinc-500">Yükleniyor…</p>
              ) : filteredBrands.length === 0 ? (
                <p className="px-4 py-6 text-sm text-zinc-500">
                  {brands.length === 0 ? "Bu kategoride marka yok." : "Eşleşen marka yok."}
                </p>
              ) : (
                filteredBrands.map((b) => {
                  const on = draft.brandIds.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => toggleBrand(b.id)}
                      className="flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-3.5 text-left"
                    >
                      <Check on={on} />
                      <span className="text-sm font-medium text-zinc-900">
                        {b.name ?? b.code ?? "Marka"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : panel === "model" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <SearchBox value={query} onChange={setQuery} placeholder="Model ara" />
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingModels ? (
                <p className="px-4 py-6 text-sm text-zinc-500">Yükleniyor…</p>
              ) : filteredModels.length === 0 ? (
                <p className="px-4 py-6 text-sm text-zinc-500">
                  {models.length === 0 ? "Bu markada model yok." : "Eşleşen model yok."}
                </p>
              ) : (
                filteredModels.map((m) => {
                  const label = (m.name ?? m.code ?? "").trim();
                  if (!label) return null;
                  const on = draft.models.includes(label);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleModel(label)}
                      className="flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-3.5 text-left"
                    >
                      <Check on={on} />
                      <span className="text-sm font-medium text-zinc-900">{label}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <FilterRow
                label="Kategori"
                value={categoryName}
                onClick={() => setPanel("category")}
              />
              <FilterRow
                label="Marka"
                value={brandSummary}
                disabled={!draft.categoryId}
                hint="Önce kategori seçin"
                onClick={() => setPanel("brand")}
              />
              <FilterRow
                label="Model"
                value={modelSummary}
                disabled={draft.brandIds.length === 0}
                hint="Önce marka seçin"
                onClick={() => setPanel("model")}
              />

              <div className="border-b border-zinc-100 px-4 py-3">
                <p className="mb-2 text-sm font-semibold text-zinc-900">Fiyat</p>
                <div className="flex items-center gap-2">
                  <input
                    inputMode="numeric"
                    placeholder="Min"
                    value={formatTrInt(draft.minPrice)}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        minPrice: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  />
                  <span className="text-zinc-400">–</span>
                  <input
                    inputMode="numeric"
                    placeholder="Max"
                    value={formatTrInt(draft.maxPrice)}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        maxPrice: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="border-b border-zinc-100 px-4 py-3">
                <p className="mb-1.5 text-sm font-semibold text-zinc-900">
                  Model yılı
                </p>
                <p className="mb-2 text-[11px] text-zinc-500">
                  Örn. 2015 – 2024
                </p>
                <div className="mb-4 flex items-end gap-2">
                  <label className="min-w-0 flex-1">
                    <span className="mb-1 block text-[11px] font-medium text-zinc-600">
                      En eski
                    </span>
                    <input
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="2015"
                      value={draft.minYear}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          minYear: e.target.value.replace(/\D/g, "").slice(0, 4),
                        }))
                      }
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm tabular-nums"
                    />
                  </label>
                  <span className="pb-2.5 text-zinc-400" aria-hidden>
                    –
                  </span>
                  <label className="min-w-0 flex-1">
                    <span className="mb-1 block text-[11px] font-medium text-zinc-600">
                      En yeni
                    </span>
                    <input
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="2024"
                      value={draft.maxYear}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          maxYear: e.target.value.replace(/\D/g, "").slice(0, 4),
                        }))
                      }
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm tabular-nums"
                    />
                  </label>
                </div>

                <p className="mb-1.5 text-sm font-semibold text-zinc-900">
                  Kilometre
                </p>
                <p className="mb-2 text-[11px] text-zinc-500">
                  Örn. 0 – 150.000
                </p>
                <div className="flex items-end gap-2">
                  <label className="min-w-0 flex-1">
                    <span className="mb-1 block text-[11px] font-medium text-zinc-600">
                      En az
                    </span>
                    <input
                      inputMode="numeric"
                      placeholder="0"
                      value={formatTrInt(draft.minKm)}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          minKm: e.target.value.replace(/\D/g, ""),
                        }))
                      }
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm tabular-nums"
                    />
                  </label>
                  <span className="pb-2.5 text-zinc-400" aria-hidden>
                    –
                  </span>
                  <label className="min-w-0 flex-1">
                    <span className="mb-1 block text-[11px] font-medium text-zinc-600">
                      En fazla
                    </span>
                    <input
                      inputMode="numeric"
                      placeholder="150.000"
                      value={formatTrInt(draft.maxKm)}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          maxKm: e.target.value.replace(/\D/g, ""),
                        }))
                      }
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm tabular-nums"
                    />
                  </label>
                </div>
              </div>

              <div className="border-b border-zinc-100 px-4 py-3">
                <p className="mb-2 text-sm font-semibold text-zinc-900">Yakıt</p>
                <div className="flex flex-wrap gap-1.5">
                  {HOME_FILTER_FUELS.map((fuel) => {
                    const on = draft.fuelType === fuel;
                    return (
                      <button
                        key={fuel}
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({ ...d, fuelType: on ? "" : fuel }))
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                          on
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"
                        }`}
                      >
                        {fuel}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-b border-zinc-100 px-4 py-3">
                <p className="mb-2 text-sm font-semibold text-zinc-900">Vites</p>
                <div className="flex flex-wrap gap-1.5">
                  {HOME_FILTER_TRANSMISSIONS.map((tr) => {
                    const on = draft.transmissionType === tr;
                    return (
                      <button
                        key={tr}
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            transmissionType: on ? "" : tr,
                          }))
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                          on
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"
                        }`}
                      >
                        {tr}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-4 py-3">
                <p className="mb-2 text-sm font-semibold text-zinc-900">Diğer</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({ ...d, hasPhoto: !d.hasPhoto }))
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      draft.hasPhoto
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"
                    }`}
                  >
                    Fotoğraflı
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({ ...d, vehiclesOnly: !d.vehiclesOnly }))
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      draft.vehiclesOnly
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"
                    }`}
                  >
                    Sadece araç
                  </button>
                </div>
              </div>

              {rangeErr ? (
                <p
                  className="mx-4 mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  {rangeErr}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 gap-2 border-t border-zinc-200 px-4 py-3">
              <button
                type="button"
                onClick={onReset}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Sıfırla
              </button>
              <button
                type="button"
                onClick={apply}
                className="flex-[2] rounded-lg bg-zinc-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Uygula
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
