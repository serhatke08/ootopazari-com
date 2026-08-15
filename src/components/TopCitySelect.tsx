"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CityRow } from "@/lib/listings-data";
import { parseCityIdsParam } from "@/lib/home-listings-feed-filters";

export function TopCitySelect({ cities }: { cities: CityRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draftIds, setDraftIds] = useState<string[]>([]);

  const cityOptions = Array.isArray(cities) ? cities : [];
  const appliedIds = useMemo(
    () =>
      pathname === "/" ? parseCityIdsParam(searchParams.get("city_id")) : [],
    [pathname, searchParams]
  );
  const draftSet = useMemo(() => new Set(draftIds), [draftIds]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    setDraftIds(appliedIds);
  }, [open, appliedIds]);

  function commit(nextIds: string[]) {
    const p = new URLSearchParams(searchParams.toString());
    if (nextIds.length > 0) p.set("city_id", nextIds.join(","));
    else p.delete("city_id");
    p.delete("page");
    const qs = p.toString();
    router.push(qs ? `/?${qs}` : "/");
    setOpen(false);
  }

  function toggleDraft(id: string) {
    setDraftIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return cityOptions;
    return cityOptions.filter((c) =>
      (c.name ?? "").toLocaleLowerCase("tr").includes(q)
    );
  }, [cityOptions, query]);

  const label = (() => {
    if (appliedIds.length === 0) return "Tüm Şehirler";
    if (appliedIds.length === 1) {
      return (
        cityOptions.find((c) => c.id === appliedIds[0])?.name ?? "1 şehir"
      );
    }
    return `${appliedIds.length} şehir`;
  })();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex min-w-[96px] items-center justify-between gap-1 rounded-md border px-2 py-1 text-[11px] shadow-sm sm:min-w-[110px] sm:text-xs ${
          appliedIds.length > 0
            ? "border-blue-600 bg-blue-50 font-medium text-blue-700 hover:bg-blue-100"
            : "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-400"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{label}</span>
        <svg
          className="h-3.5 w-3.5 shrink-0 opacity-60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-lg border border-zinc-200 bg-white p-2 shadow-xl">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Şehir ara"
              className="mb-2 w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
            <div className="max-h-64 overflow-y-auto">
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-50">
                <input
                  type="checkbox"
                  checked={draftIds.length === 0}
                  onChange={() => setDraftIds([])}
                  className="h-3.5 w-3.5 rounded border-zinc-300"
                />
                Tüm Şehirler
              </label>
              {filtered.map((city) => {
                const checked = draftSet.has(city.id);
                return (
                  <label
                    key={city.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDraft(city.id)}
                      className="h-3.5 w-3.5 rounded border-zinc-300"
                    />
                    <span className="truncate">{city.name ?? "Şehir"}</span>
                  </label>
                );
              })}
              {filtered.length === 0 ? (
                <p className="px-2 py-3 text-xs text-zinc-500">Şehir yok.</p>
              ) : null}
            </div>
            <div className="mt-2 flex items-center justify-end gap-2 border-t border-zinc-100 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => commit(draftIds)}
                className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                Tamam
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
