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
  const [brands, setBrands] = useState<{ id: string; name: string | null; code?: string | null }[]>([]);
  const [models, setModels] = useState<{ id: string; name: string | null; code?: string | null }[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (c) => !isHiddenFilterCategory(c.code, c.name)
      ),
    [categories]
  );

  useEffect(() => {
    if (open) {
      setDraft(filtersToDraft(applied));
      setRangeErr(null);
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
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 id="home-filter-title" className="text-base font-bold text-zinc-900">
            Filtrele{badge > 0 ? ` · ${badge}` : ""}
          </h2>
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
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
              Kategori
            </p>
            <div className="flex flex-wrap gap-1.5">
              {visibleCategories.map((c) => {
                const on = draft.categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(on ? "" : c.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      on
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"
                    }`}
                  >
                    {c.name ?? c.code ?? "Kategori"}
                  </button>
                );
              })}
            </div>
          </section>

          {draft.categoryId ? (
            <section>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Marka
              </p>
              {loadingBrands ? (
                <p className="text-xs text-zinc-500">Yükleniyor…</p>
              ) : brands.length === 0 ? (
                <p className="text-xs text-zinc-500">Bu kategoride marka yok.</p>
              ) : (
                <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                  {brands.map((b) => {
                    const on = draft.brandIds.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggleBrand(b.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                          on
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"
                        }`}
                      >
                        {b.name ?? b.code ?? "Marka"}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          {draft.brandIds.length > 0 ? (
            <section>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Model
              </p>
              {loadingModels ? (
                <p className="text-xs text-zinc-500">Yükleniyor…</p>
              ) : models.length === 0 ? (
                <p className="text-xs text-zinc-500">Bu markada model yok.</p>
              ) : (
                <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                  {models.map((m) => {
                    const label = (m.name ?? m.code ?? "").trim();
                    if (!label) return null;
                    const on = draft.models.includes(label);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleModel(label)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                          on
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
              Fiyat
            </p>
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                placeholder="Min"
                value={formatTrInt(draft.minPrice)}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, minPrice: e.target.value.replace(/\D/g, "") }))
                }
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
              <span className="text-zinc-400">–</span>
              <input
                inputMode="numeric"
                placeholder="Max"
                value={formatTrInt(draft.maxPrice)}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, maxPrice: e.target.value.replace(/\D/g, "") }))
                }
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
              Yıl & km
            </p>
            <div className="mb-2 flex items-center gap-2">
              <input
                inputMode="numeric"
                placeholder="Min yıl"
                value={draft.minYear}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, minYear: e.target.value.replace(/\D/g, "") }))
                }
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
              <span className="text-zinc-400">–</span>
              <input
                inputMode="numeric"
                placeholder="Max yıl"
                value={draft.maxYear}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, maxYear: e.target.value.replace(/\D/g, "") }))
                }
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                placeholder="Min km"
                value={formatTrInt(draft.minKm)}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, minKm: e.target.value.replace(/\D/g, "") }))
                }
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
              <span className="text-zinc-400">–</span>
              <input
                inputMode="numeric"
                placeholder="Max km"
                value={formatTrInt(draft.maxKm)}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, maxKm: e.target.value.replace(/\D/g, "") }))
                }
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
              Yakıt
            </p>
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
          </section>

          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
              Vites
            </p>
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
          </section>

          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
              Diğer
            </p>
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
          </section>

          {rangeErr ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
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
      </div>
    </div>,
    document.body
  );
}
