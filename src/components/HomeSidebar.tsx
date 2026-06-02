import { Suspense } from "react";
import type { CategoryRow } from "@/lib/listings-data";
import { VehicleCascadeSidebar } from "@/components/VehicleCascadeSidebar";
import { SidebarQuickLinks } from "@/components/SidebarQuickLinks";

/** Ana sayfa sol sütun: kategori listesi + bayi kısayolları (scroll yok). */
export function HomeSidebar({ categories }: { categories: CategoryRow[] }) {
  return (
    <div className="home-category-dealers-panel w-full overflow-visible">
      <div className="space-y-2 overflow-visible">
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
        <div className="border-t border-zinc-200 bg-white pt-3">
          <SidebarQuickLinks compact />
        </div>
      </div>
    </div>
  );
}
