"use client";

import dynamic from "next/dynamic";

const DealerMap = dynamic(
  () => import("@/components/dealer-map/DealerMap").then((m) => m.DealerMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[calc(100dvh-9.5rem)] flex-1 items-center justify-center bg-zinc-100">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    ),
  }
);

export function HaritaMap() {
  return <DealerMap />;
}
