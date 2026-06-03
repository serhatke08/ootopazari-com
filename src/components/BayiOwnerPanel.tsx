"use client";

import { useState } from "react";
import type { DealerType, BayiApplication } from "@/lib/bayi-types";
import { DEALER_TYPE_LABELS } from "@/lib/bayi-types";
import {
  normalizeDealerState,
  isDealerPanelLocked,
  getDealerStateMessage,
  getMonthlyFeeForType,
} from "@/lib/bayi-application-status";
import { getAddProductButtonText } from "@/lib/dealer-listing-tables";

type Tab = "home" | "messages" | "products" | "analytics" | "store";

type Props = {
  dealerType: DealerType;
  application: BayiApplication;
  children?: React.ReactNode;
};

export function BayiOwnerPanel({ dealerType, application, children }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  const dealerState = normalizeDealerState(
    application.status,
    application.payment_status,
    application.membership_expires_at
  );
  const isPanelLocked = isDealerPanelLocked(dealerState);
  const monthlyFee = getMonthlyFeeForType(dealerType);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "home",
      label: "Ana Sayfa",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      key: "messages",
      label: "Mesajlar",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      ),
    },
    {
      key: "products",
      label: getAddProductButtonText(dealerType),
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      ),
    },
    {
      key: "analytics",
      label: "Analitik",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      key: "store",
      label: "Bayim",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
    },
  ];

  function handleTabClick(tab: Tab) {
    if (isPanelLocked && tab !== "home") {
      return; // Locked tabs can't be clicked
    }
    setActiveTab(tab);
  }

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-zinc-900">
          {DEALER_TYPE_LABELS[dealerType]} Bayi Paneli
        </h1>
        <p className="mt-1 text-zinc-600">{application.dealer_name}</p>
      </div>

      {/* Payment Warning Banner */}
      {isPanelLocked && dealerState === "approved_awaiting_payment" ? (
        <div className="mb-6 overflow-hidden rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-full bg-blue-500 p-3">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-blue-900">
                Bayi Panelinizi Aktifleştirin
              </h3>
              <p className="mt-1 text-blue-800">
                Başvurunuz onaylandı! Tüm özelliklere erişmek için aylık üyelik ücretini ödeyin.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="rounded-lg bg-white px-4 py-2 shadow-sm">
                  <p className="text-sm font-medium text-zinc-600">Aylık Ücret</p>
                  <p className="text-2xl font-bold text-zinc-900">
                    ₺{monthlyFee.toLocaleString("tr-TR")}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700"
                >
                  Ödeme Yap
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 border-b border-zinc-200">
          {tabs.map((tab) => {
            const isLocked = isPanelLocked && tab.key !== "home";
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                disabled={isLocked}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "border-[#ffc400] text-[#ffc400]"
                    : isLocked
                      ? "border-transparent text-zinc-400 cursor-not-allowed"
                      : "border-transparent text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {tab.icon}
                {tab.label}
                {isLocked ? (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "home" ? (
          <div>{children}</div>
        ) : activeTab === "messages" ? (
          <LockedTabContent
            title="Mesajlar"
            description="Müşterilerinizle mesajlaşın"
          />
        ) : activeTab === "products" ? (
          <LockedTabContent
            title={getAddProductButtonText(dealerType)}
            description="Yeni ürün veya araç ekleyin"
          />
        ) : activeTab === "analytics" ? (
          <LockedTabContent
            title="Analitik"
            description="İstatistiklerinizi görüntüleyin"
          />
        ) : activeTab === "store" ? (
          <LockedTabContent
            title="Bayim"
            description="Bayi bilgilerinizi yönetin"
          />
        ) : null}
      </div>
    </div>
  );
}

function LockedTabContent({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-12 text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-200">
        <svg className="h-10 w-10 text-zinc-400" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-zinc-900">{title}</h3>
      <p className="mt-2 text-zinc-600">{description}</p>
      <p className="mt-4 text-sm text-zinc-500">
        Bu özelliğe erişmek için üyelik ödemenizi tamamlayın.
      </p>
    </div>
  );
}
