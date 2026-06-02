import { Suspense } from "react";
import type { CategoryRow } from "@/lib/listings-data";
import { VehicleCascadeSidebar } from "@/components/VehicleCascadeSidebar";
import { SidebarQuickLinks } from "@/components/SidebarQuickLinks";

/** Ana sayfa sol sütun: kategori cascade kaydırılabilir, kısayollar altta sabit. */
export function HomeSidebar({ categories }: { categories: CategoryRow[] }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <div className="home-category-cascade-scroll min-h-0 flex-1 pr-0.5">
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
      </div>
      <div className="mt-2 shrink-0 border-t border-zinc-200 bg-white pt-3">
        <SidebarQuickLinks compact />
      </div>
    </div>
  );
}
