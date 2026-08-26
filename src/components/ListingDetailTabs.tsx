"use client";

import { useState, type ReactNode } from "react";

type Tab = "info" | "description" | "equipment" | "expertiz";

type Props = {
  infoContent: ReactNode;
  descriptionContent: ReactNode;
  equipmentContent: ReactNode;
  /** Kaporta ekspertiz şeması; verildiğinde dördüncü sekme açılır */
  expertizContent?: ReactNode | null;
  publishedAt?: string | null;
};

const BASE_TABS: Array<{ id: Tab; label: string }> = [
  { id: "info", label: "Araç bilgileri" },
  { id: "description", label: "Açıklama" },
  { id: "equipment", label: "Donanım" },
];

function tabButtonClass(active: boolean) {
  return `min-w-0 flex-1 rounded-xl px-3 py-2.5 text-xs font-semibold leading-snug transition sm:px-4 sm:py-3 sm:text-sm ${
    active
      ? "bg-[#7c3aed] text-white shadow-sm"
      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800"
  }`;
}

export function ListingDetailTabs({
  infoContent,
  descriptionContent,
  equipmentContent,
  expertizContent,
  publishedAt,
}: Props) {
  const tabs = expertizContent
    ? [...BASE_TABS, { id: "expertiz" as const, label: "Ekspertiz" }]
    : BASE_TABS;
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const activeLabel =
    tabs.find((t) => t.id === activeTab)?.label ?? "Araç bilgileri";

  return (
    <div className="space-y-2">
      <div
        className="flex gap-1.5"
        role="tablist"
        aria-label="İlan detay sekmeleri"
      >
        {tabs.map((tab) => (
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
        <h2 className="min-w-0 truncate text-xs font-semibold text-zinc-900">
          {activeLabel}
        </h2>
        {publishedAt ? (
          <p className="shrink-0 text-[10px] tabular-nums text-zinc-500">
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
        {activeTab === "expertiz" && expertizContent ? (
          <div className="p-3">{expertizContent}</div>
        ) : null}
      </div>
    </div>
  );
}
