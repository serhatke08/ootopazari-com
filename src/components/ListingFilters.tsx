"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function ListingFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const minPrice = searchParams.get("min_price") ?? "";
  const maxPrice = searchParams.get("max_price") ?? "";
  const minYear = searchParams.get("min_year") ?? "";
  const maxYear = searchParams.get("max_year") ?? "";
  const minKm = searchParams.get("min_km") ?? "";
  const maxKm = searchParams.get("max_km") ?? "";

  const [localMinPrice, setLocalMinPrice] = useState(minPrice);
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice);
  const [localMinYear, setLocalMinYear] = useState(minYear);
  const [localMaxYear, setLocalMaxYear] = useState(maxYear);
  const [localMinKm, setLocalMinKm] = useState(minKm);
  const [localMaxKm, setLocalMaxKm] = useState(maxKm);

  function applyFilters() {
    const p = new URLSearchParams(searchParams.toString());
    
    if (localMinPrice) p.set("min_price", localMinPrice);
    else p.delete("min_price");
    
    if (localMaxPrice) p.set("max_price", localMaxPrice);
    else p.delete("max_price");
    
    if (localMinYear) p.set("min_year", localMinYear);
    else p.delete("min_year");
    
    if (localMaxYear) p.set("max_year", localMaxYear);
    else p.delete("max_year");
    
    if (localMinKm) p.set("min_km", localMinKm);
    else p.delete("min_km");
    
    if (localMaxKm) p.set("max_km", localMaxKm);
    else p.delete("max_km");
    
    p.delete("page");
    const qs = p.toString();
    router.push(qs ? `/?${qs}` : "/");
    setIsOpen(false);
  }

  function clearFilters() {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("min_price");
    p.delete("max_price");
    p.delete("min_year");
    p.delete("max_year");
    p.delete("min_km");
    p.delete("max_km");
    p.delete("page");
    
    setLocalMinPrice("");
    setLocalMaxPrice("");
    setLocalMinYear("");
    setLocalMaxYear("");
    setLocalMinKm("");
    setLocalMaxKm("");
    
    const qs = p.toString();
    router.push(qs ? `/?${qs}` : "/");
    setIsOpen(false);
  }

  const hasActiveFilters = minPrice || maxPrice || minYear || maxYear || minKm || maxKm;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm transition sm:text-sm ${
          hasActiveFilters
            ? "border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100"
            : "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-400"
        }`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filtrele
        {hasActiveFilters ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
            {[minPrice, maxPrice, minYear, maxYear, minKm, maxKm].filter(Boolean).length}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-zinc-200 bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900">Filtreler</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                  Fiyat Aralığı (₺)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={localMinPrice}
                    onChange={(e) => setLocalMinPrice(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                  <span className="text-zinc-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={localMaxPrice}
                    onChange={(e) => setLocalMaxPrice(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                  Yıl Aralığı
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={localMinYear}
                    onChange={(e) => setLocalMinYear(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                  <span className="text-zinc-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={localMaxYear}
                    onChange={(e) => setLocalMaxYear(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                  Kilometre Aralığı
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={localMinKm}
                    onChange={(e) => setLocalMinKm(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                  <span className="text-zinc-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={localMaxKm}
                    onChange={(e) => setLocalMaxKm(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={clearFilters}
                className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Temizle
              </button>
              <button
                onClick={applyFilters}
                className="flex-1 rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Uygula
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
