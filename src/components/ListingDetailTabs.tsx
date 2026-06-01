"use client";

import { useState, type ReactNode } from "react";
import { useIsClient } from "@/hooks/use-is-client";

type Tab = "info" | "description" | "equipment";

type Props = {
  header?: ReactNode;
  infoContent: ReactNode;
  descriptionContent: ReactNode;
  equipmentContent: ReactNode;
};

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "info", label: "Genel Bilgiler" },
  { id: "description", label: "Açıklama" },
  { id: "equipment", label: "Donanım" },
];

const SHELL_CLASS =
  "overflow-hidden rounded-xl border border-black/10 bg-white md:flex md:max-h-[min(72vh,680px)] md:flex-col lg:max-h-[min(72vh,680px)]";

const TAB_LIST_CLASS = "flex shrink-0 border-b border-black/10";

const BODY_CLASS =
  "min-h-[200px] bg-white md:min-h-0 md:flex-1 md:overflow-y-auto lg:min-h-0 lg:flex-1 lg:overflow-y-auto";

const ACTIVE_TAB_CLASS =
  "border-b-2 border-black bg-white text-black font-semibold";
const INACTIVE_TAB_CLASS =
  "border-b-2 border-transparent bg-white text-black/60 hover:text-black hover:border-black/30";

function tabButtonClass(active: boolean) {
  return `flex-1 px-3 py-2.5 text-sm transition sm:px-4 ${
    active ? ACTIVE_TAB_CLASS : INACTIVE_TAB_CLASS
  }`;
}

function ListingDetailTabsStatic({
  header,
  infoContent,
}: Pick<Props, "header" | "infoContent">) {
  return (
    <div className={SHELL_CLASS}>
      {header ? (
        <div className="shrink-0 border-b border-black/10">{header}</div>
      ) : null}
      <div
        className={TAB_LIST_CLASS}
        role="tablist"
        aria-label="İlan detay sekmeleri"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === "info"}
            disabled
            className={tabButtonClass(tab.id === "info")}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={BODY_CLASS}>
        <div>{infoContent}</div>
      </div>
    </div>
  );
}

function ListingDetailTabsInteractive({
  header,
  infoContent,
  descriptionContent,
  equipmentContent,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("info");

  return (
    <div className={SHELL_CLASS}>
      {header ? (
        <div className="shrink-0 border-b border-black/10">{header}</div>
      ) : null}
      <div
        className={TAB_LIST_CLASS}
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

      <div className={BODY_CLASS}>
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

export function ListingDetailTabs(props: Props) {
  const isClient = useIsClient();
  if (!isClient) {
    return (
      <ListingDetailTabsStatic
        header={props.header}
        infoContent={props.infoContent}
      />
    );
  }
  return <ListingDetailTabsInteractive {...props} />;
}
