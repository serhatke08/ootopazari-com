import { Suspense } from "react";
import type { CategoryRow } from "@/lib/listings-data";
import { VehicleCascadeSidebar } from "@/components/VehicleCascadeSidebar";
import { HomeAppPromoRail } from "@/components/HomeAppPromoRail";

/** Ana sayfa sol sütun: kategoriler + hemen altında app promo (birlikte kayar). */
export function HomeSidebar({ categories }: { categories: CategoryRow[] }) {
  return (
    <div className="home-category-cascade-scroll relative z-10 h-full min-h-0 w-full flex-1 overflow-y-auto pr-0.5">
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
      <div className="mt-6 pb-2">
        <HomeAppPromoRail />
      </div>
    </div>
  );
}
