"use client";

import { useState, type ReactNode } from "react";

type Tab = "info" | "description" | "equipment";

type Props = {
  infoContent: ReactNode;
  descriptionContent: ReactNode;
  equipmentContent: ReactNode;
};

export function ListingDetailTabs({
  infoContent,
  descriptionContent,
  equipmentContent,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("info");

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "info", label: "Genel Bilgiler" },
    { id: "description", label: "Açıklama" },
    { id: "equipment", label: "Donanım" },
  ];

  const activeClass =
    "border-b-2 border-black bg-white text-black font-semibold";
  const inactiveClass =
    "border-b-2 border-transparent bg-white text-black/60 hover:text-black hover:border-black/30";

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div
        className="flex border-b border-black/10"
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
            className={`flex-1 px-3 py-2.5 text-sm transition sm:px-4 ${
              activeTab === tab.id ? activeClass : inactiveClass
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[200px] bg-white">
        {activeTab === "info" && <div>{infoContent}</div>}
        {activeTab === "description" && (
          <div className="p-4">{descriptionContent}</div>
        )}
        {activeTab === "equipment" && (
          <div className="p-4">{equipmentContent}</div>
        )}
      </div>
    </div>
  );
}
