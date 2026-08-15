"use client";

import { useState, type ReactNode } from "react";

type Tab = "info" | "description" | "equipment";

type Props = {
  infoContent: ReactNode;
  descriptionContent: ReactNode;
  equipmentContent: ReactNode;
  publishedAt?: string | null;
};

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "info", label: "Araç bilgileri" },
  { id: "description", label: "Açıklama" },
  { id: "equipment", label: "Donanım" },
];

function tabButtonClass(active: boolean) {
  return `min-w-0 flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold leading-tight transition sm:text-xs ${
    active
      ? "bg-[#7c3aed] text-white shadow-sm"
      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800"
  }`;
}

export function ListingDetailTabs({
  infoContent,
  descriptionContent,
  equipmentContent,
  publishedAt,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const activeLabel = TABS.find((t) => t.id === activeTab)?.label ?? "Araç bilgileri";

  return (
    <div className="space-y-2">
      <div
        className="flex gap-1.5"
        role="tablist"
        aria-label="İlan detay sekmeleri"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={tabButtonClass(activeTab === tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <h2 className="min-w-0 truncate text-sm font-semibold text-zinc-900">
          {activeLabel}
        </h2>
        {publishedAt ? (
          <p className="shrink-0 text-[11px] tabular-nums text-zinc-500">
            {publishedAt}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        {activeTab === "info" ? (
          <div className="listing-detail-vehicle-specs-panel">{infoContent}</div>
        ) : null}
        {activeTab === "description" ? (
          <div className="p-3">{descriptionContent}</div>
        ) : null}
        {activeTab === "equipment" ? (
          <div className="p-2.5 sm:p-3">{equipmentContent}</div>
        ) : null}
      </div>
    </div>
  );
}
