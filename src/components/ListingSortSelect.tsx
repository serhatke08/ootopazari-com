"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  HOME_LISTINGS_SORT_OPTIONS,
  type HomeListingsSort,
} from "@/lib/home-listings-feed-types";
import { parseHomeListingsSort } from "@/lib/home-listings-feed-filters";

export function ListingSortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const current = useMemo(
    () =>
      pathname === "/"
        ? parseHomeListingsSort(searchParams.get("sort"))
        : "newest",
    [pathname, searchParams]
  );
  const currentLabel =
    HOME_LISTINGS_SORT_OPTIONS.find((o) => o.value === current)?.label ??
    "Sırala";
  const active = current !== "newest";

  function apply(next: HomeListingsSort) {
    const p = new URLSearchParams(searchParams.toString());
    if (next && next !== "newest") p.set("sort", next);
    else p.delete("sort");
    p.delete("page");
    const qs = p.toString();
    router.push(qs ? `/?${qs}` : "/");
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium shadow-sm transition sm:text-xs ${
          active
            ? "border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100"
            : "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-400"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7h12M3 12h8M3 17h18"
          />
        </svg>
        {currentLabel}
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-xl">
            {HOME_LISTINGS_SORT_OPTIONS.map((opt) => {
              const selected = opt.value === current;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => apply(opt.value)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                    selected
                      ? "bg-amber-50 font-semibold text-zinc-900"
                      : "text-zinc-800 hover:bg-zinc-50"
                  }`}
                >
                  {opt.label}
                  {selected ? (
                    <span className="text-[10px] text-amber-700">✓</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
