import { Suspense } from "react";
import type { CategoryRow } from "@/lib/listings-data";
import { VehicleCascadeSidebar } from "@/components/VehicleCascadeSidebar";
import { SidebarQuickLinks } from "@/components/SidebarQuickLinks";

export function HomeSidebar({ categories }: { categories: CategoryRow[] }) {
  return (
    <div className="flex h-full max-h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 [touch-action:pan-y] [-webkit-overflow-scrolling:touch]">
        <div className="space-y-2">
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
    </div>
  );
}
