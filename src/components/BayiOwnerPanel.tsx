"use client";

import Link from "next/link";
import { useState } from "react";
import type { DealerAnalytics, DealerType, BayiApplication } from "@/lib/bayi-types";
import { DEALER_SETUP_FEE_TRY, DEALER_TYPE_LABELS } from "@/lib/bayi-types";
import {
  normalizeDealerState,
  isDealerPanelLocked,
} from "@/lib/bayi-application-status";
import { getAddProductButtonText } from "@/lib/dealer-listing-tables";
import { dealerTheme } from "@/lib/dealer-theme";
import { BayiMembershipPayButton } from "@/components/BayiMembershipPayButton";
import { BayiStoreSettingsForm } from "@/components/bayi/BayiStoreSettingsForm";
import { BayiAnalyticsBoard } from "@/components/bayi/BayiAnalyticsBoard";
import {
  BayiProductsBoard,
  type BayiProductRow,
} from "@/components/bayi/BayiProductsBoard";
import type { ListingQuotaSnapshot } from "@/lib/listing-quota";

type Tab = "home" | "messages" | "products" | "analytics" | "store";

type Props = {
  dealerType: DealerType;
  application: BayiApplication;
  cities: { id: string; name: string }[];
  listings: BayiProductRow[];
  analytics: DealerAnalytics | null;
  quota: ListingQuotaSnapshot | null;
  children?: React.ReactNode;
};

export function BayiOwnerPanel({
  dealerType,
  application,
  cities,
  listings,
  analytics,
  quota,
  children,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const theme = dealerTheme(dealerType);
  const dealerState = normalizeDealerState(
    application.status,
    application.payment_status,
    application.membership_expires_at
  );
  const locked = isDealerPanelLocked(dealerState);
  const needsPayment =
    dealerState === "approved_awaiting_payment" || dealerState === "overdue";

  const tabs: { key: Tab; label: string }[] = [
    { key: "home", label: "Vitrin" },
    { key: "products", label: getAddProductButtonText(dealerType) },
    { key: "messages", label: "Mesajlar" },
    { key: "analytics", label: "Analitik" },
    { key: "store", label: "Mağaza" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
      <div
        className="overflow-hidden rounded-3xl text-white shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%)`,
        }}
      >
        <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-7 sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">
              {DEALER_TYPE_LABELS[dealerType]} kontrol paneli
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              {application.dealer_name}
            </h1>
            <p className="mt-1 text-sm text-white/80">
              {locked
                ? "Önce 500 TL tek seferlik ücreti öde. Mağaza, stok ve analitik ödemeden sonra açılır."
                : dealerType === "galeri"
                  ? "Hesap açık. Yılda 5 ilan ücretsiz; sonrası ilan paketleri."
                  : "Bayi paneli açık. Mağaza, stok ve mesajlar senin."}
            </p>
          </div>
          {!locked ? (
            <Link
              href={`/bayi/${dealerType}`}
              className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur hover:bg-white/25"
            >
              Public vitrin
            </Link>
          ) : null}
        </div>
      </div>

      {needsPayment ? (
        <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            Tek seferlik açılış
          </p>
          <h2 className="mt-1 text-2xl font-black text-zinc-900">
            {DEALER_SETUP_FEE_TRY.toLocaleString("tr-TR")} TL
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
            {dealerState === "overdue"
              ? "Üyelik pasif. Aynı 500 TL açılış ücretiyle paneli yeniden aç."
              : dealerType === "galeri"
                ? "Ödeme bitince galeri hesabı açılır, ardından mağazayı düzenlersin. Yılda 5 ilan ücretsiz; paketler ondan sonra başlar."
                : "Önce öde. Logo, kapak, adres ve stok ödemeden sonra düzenlenir."}
          </p>
          <div className="mt-5 max-w-sm">
            <BayiMembershipPayButton
              dealerType={dealerType}
              plan="monthly"
              label="500 TL öde ve paneli aç"
              className="w-full rounded-xl bg-zinc-900 px-5 py-3 text-sm font-black text-white hover:bg-black disabled:opacity-60"
            />
          </div>
        </div>
      ) : null}

      {locked ? (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-600">
          Mesajlar, stok, analitik ve mağaza bilgisi ödeme tamamlanınca açılır.
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            {tabs.map((tab) => {
              const on = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-sm font-bold transition ${
                    on ? "text-white shadow-sm" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
                  }`}
                  style={on ? { backgroundColor: theme.primary } : undefined}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="min-w-0 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
            {activeTab === "home" ? children : null}
            {activeTab === "products" ? (
              <BayiProductsBoard
                dealerType={dealerType}
                listings={listings}
                quota={quota}
              />
            ) : null}
            {activeTab === "messages" ? (
              <div>
                <h2 className="text-2xl font-black tracking-tight text-zinc-900">
                  Müşteri mesajları
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Gelen kutusu ortak mesajlar sayfasında. Bayi ilanlarından gelen sohbetler orada toplanır.
                </p>
                <Link
                  href="/mesajlar"
                  className="mt-5 inline-flex rounded-xl px-4 py-2.5 text-sm font-black text-white"
                  style={{ backgroundColor: theme.primary }}
                >
                  Mesajlara git
                </Link>
              </div>
            ) : null}
            {activeTab === "analytics" ? (
              <BayiAnalyticsBoard
                dealerType={dealerType}
                storeName={application.dealer_name}
                analytics={analytics}
              />
            ) : null}
            {activeTab === "store" ? (
              <BayiStoreSettingsForm
                dealerType={dealerType}
                application={application}
                cities={cities}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
