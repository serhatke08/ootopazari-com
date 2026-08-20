import { Suspense } from "react";
import type { CategoryRow } from "@/lib/listings-data";
import { VehicleCascadeSidebar } from "@/components/VehicleCascadeSidebar";
import { HomeNotificationsRail } from "@/components/HomeNotificationsRail";

/** Ana sayfa sol sütun: kategori cascade + altta dikey bildirim paneli (PC) */
export function HomeSidebar({ categories }: { categories: CategoryRow[] }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <div className="home-category-cascade-scroll min-h-0 flex-[1.2] overflow-y-auto pr-0.5">
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
      <div className="mt-2 flex min-h-[13rem] flex-1 flex-col overflow-hidden">
        <HomeNotificationsRail />
      </div>
    </div>
  );
}
