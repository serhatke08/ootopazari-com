import { Suspense } from "react";
import type { CategoryRow } from "@/lib/listings-data";
import { VehicleCascadeSidebar } from "@/components/VehicleCascadeSidebar";
import { HomeAppPromoRail } from "@/components/HomeAppPromoRail";

/** Ana sayfa sol sütun: kategoriler, hemen altında dikey uygulama paneli */
export function HomeSidebar({ categories }: { categories: CategoryRow[] }) {
  return (
    <div className="home-category-cascade-scroll flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto pr-0.5">
      <Suspense
        fallback={
          <div
            className="min-h-[12rem] rounded-lg border border-zinc-200 bg-zinc-50/90"
            aria-hidden
          />
        }
      >
        <VehicleCascadeSidebar categories={categories} fillColumn compact />
      </Suspense>
      <div className="shrink-0 pb-2">
        <HomeAppPromoRail />
      </div>
    </div>
  );
}
