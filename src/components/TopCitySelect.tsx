"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CityRow } from "@/lib/listings-data";

export function TopCitySelect({ cities }: { cities: CityRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const cityOptions = Array.isArray(cities) ? cities : [];
  const currentCityId = useMemo(
    () => (pathname === "/" ? (searchParams.get("city_id") ?? "") : ""),
    [pathname, searchParams]
  );
  const [selectedCityId, setSelectedCityId] = useState(currentCityId);

  useEffect(() => {
    setSelectedCityId(currentCityId);
  }, [currentCityId]);

  function onChange(nextCityId: string) {
    setSelectedCityId(nextCityId);
    const p = new URLSearchParams(searchParams.toString());
    if (nextCityId) p.set("city_id", nextCityId);
    else p.delete("city_id");
    p.delete("page");
    const qs = p.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <div className="mb-5 sm:mb-6">
      <select
        name="city_id"
        value={selectedCityId}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[130px] rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 sm:min-w-[145px] sm:text-sm"
      >
        <option value="">Tüm Şehirler</option>
        {cityOptions.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name ?? "Şehir"}
          </option>
        ))}
      </select>
    </div>
  );
}
