"use client";

import Link from "next/link";
import { useState } from "react";
import type { DealerType, BayiApplication } from "@/lib/bayi-types";
import { DEALER_TYPE_LABELS } from "@/lib/bayi-types";
import {
  normalizeDealerState,
  isDealerPanelLocked,
  getMonthlyFeeForType,
} from "@/lib/bayi-application-status";
import { formatFeatureBoostDate, parseListingDate } from "@/lib/listing-feature-boost";
import { getAddProductButtonText } from "@/lib/dealer-listing-tables";
import { BayiMembershipPayButton } from "@/components/BayiMembershipPayButton";

type Tab = "home" | "messages" | "products" | "analytics" | "store";

type Props = {
  dealerType: DealerType;
  application: BayiApplication;
  children?: React.ReactNode;
};

const BAYI_MEMBERSHIP_YEARLY_DISCOUNT_RATE = 0.3;

export function BayiOwnerPanel({ dealerType, application, children }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  const dealerState = normalizeDealerState(
    application.status,
    application.payment_status,
    application.membership_expires_at
  );
  const isPanelLocked = isDealerPanelLocked(dealerState);
  const monthlyFee = getMonthlyFeeForType(dealerType);
  const yearlyRaw = monthlyFee * 12;
  const yearlyDiscounted = yearlyRaw * (1 - BAYI_MEMBERSHIP_YEARLY_DISCOUNT_RATE);
  const yearlySavings = yearlyRaw - yearlyDiscounted;
  const membershipExpiresLabel = application.membership_expires_at
    ? formatFeatureBoostDate(parseListingDate(application.membership_expires_at))
    : null;
  const needsPayment =
    dealerState === "approved_awaiting_payment" || dealerState === "overdue";

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
      label: dealerType === "parcaci" ? "Urun Yonetimi" : getAddProductButtonText(dealerType),
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
      label: dealerType === "parcaci" ? "Magaza Bilgileri" : "Bayim",
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
      {needsPayment ? (
        <div
          className={`mb-6 overflow-hidden rounded-xl border-2 p-6 ${
            dealerState === "overdue"
              ? "border-red-200 bg-gradient-to-r from-red-50 to-red-100"
              : "border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`shrink-0 rounded-full p-3 ${
                dealerState === "overdue" ? "bg-red-500" : "bg-blue-500"
              }`}
            >
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
              <h3
                className={`text-lg font-bold ${
                  dealerState === "overdue" ? "text-red-900" : "text-blue-900"
                }`}
              >
                {dealerState === "overdue"
                  ? "Üyelik süreniz doldu"
                  : "Bayi panelinizi aktifleştirin"}
              </h3>
              <p
                className={`mt-1 ${
                  dealerState === "overdue" ? "text-red-800" : "text-blue-800"
                }`}
              >
                {dealerState === "overdue"
                  ? "Panel özelliklerine devam etmek için aylık üyeliğinizi yenileyin."
                  : "Başvurunuz onaylandı! Tüm özelliklere erişmek için aylık üyelik ücretini ödeyin."}
              </p>
              <div className="mt-4 grid w-full gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
                  <p className="text-sm font-medium text-zinc-600">Aylık plan (30 gün)</p>
                  <p className="text-2xl font-bold text-zinc-900">
                    ₺{monthlyFee.toLocaleString("tr-TR")}
                  </p>
                  <BayiMembershipPayButton
                    dealerType={dealerType}
                    plan="monthly"
                    label={dealerState === "overdue" ? "Aylık yenile" : "Aylık ödeme"}
                    className="mt-3 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
                <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 px-4 py-3 shadow-sm">
                  <p className="text-sm font-medium text-emerald-800">
                    Yıllık plan (360 gün) · %30 indirim
                  </p>
                  <p className="text-2xl font-bold text-emerald-900">
                    ₺{Math.round(yearlyDiscounted).toLocaleString("tr-TR")}
                  </p>
                  <p className="text-xs text-emerald-700">
                    Normal: ₺{Math.round(yearlyRaw).toLocaleString("tr-TR")} · Tasarruf: ₺{Math.round(yearlySavings).toLocaleString("tr-TR")}
                  </p>
                  <BayiMembershipPayButton
                    dealerType={dealerType}
                    plan="yearly"
                    label={dealerState === "overdue" ? "Yıllık yenile" : "Yıllık ödeme"}
                    className="mt-3 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {dealerState === "active" && membershipExpiresLabel ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p>
            <span className="font-bold">Üyelik aktif</span>
            {" · "}
            Bitiş: {membershipExpiresLabel}
            {" · "}
            <Link href="/profil/odemeler" className="font-semibold underline">
              Ödeme geçmişi
            </Link>
          </p>
          <div className="flex items-center gap-2">
            <BayiMembershipPayButton
              dealerType={dealerType}
              plan="monthly"
              label="Aylık ekle"
              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <BayiMembershipPayButton
              dealerType={dealerType}
              plan="yearly"
              label="%30 indirimli yıllık"
              className="rounded-lg bg-emerald-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>
      ) : null}

      {dealerType === "parcaci" && dealerState === "active" ? (
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
                Parcaci Hizli Islem
              </p>
              <p className="text-sm font-bold">Musteri ve bayi gorunumleri ayrildi</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("products")}
                className="rounded-lg bg-[#ffcc00] px-3 py-2 text-xs font-extrabold text-black hover:bg-[#ffd84d]"
              >
                Urun ekle / duzenle
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("store")}
                className="rounded-lg border border-zinc-500 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-800"
              >
                Magaza bilgisi duzenle
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("messages")}
                className="rounded-lg border border-zinc-500 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-800"
              >
                Musteri mesajlari
              </button>
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
