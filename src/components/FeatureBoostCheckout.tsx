"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FeatureBoostListingCard } from "@/components/FeatureBoostListingCard";
import { FeatureBoostOrderSummary } from "@/components/FeatureBoostOrderSummary";
import { FeatureBoostPackPicker } from "@/components/FeatureBoostPackPicker";
import type { FeatureBoostListingOption } from "@/lib/feature-boost-listing";
import type { ListingBoostPaymentInfo } from "@/lib/feature-boost-payment-status";
import { FEATURE_BOOST_PACKS } from "@/lib/listing-feature-boost";
import { PaymentLegalNotice } from "@/components/PaymentLegalNotice";

type Props = {
  listings: FeatureBoostListingOption[];
  initialListingNumber?: string | null;
  paymentInfoByListing?: Record<string, ListingBoostPaymentInfo>;
};

function pickInitialListingIds(
  listings: FeatureBoostListingOption[],
  initialListingNumber?: string | null
): string[] {
  if (initialListingNumber) {
    const fromUrl = listings.find(
      (l) => l.listingNumber === initialListingNumber && l.canBoost
    );
    if (fromUrl) return [fromUrl.id];
  }
  return listings.find((l) => l.canBoost)?.id
    ? [listings.find((l) => l.canBoost)!.id]
    : [];
}

export function FeatureBoostCheckout({
  listings,
  initialListingNumber,
  paymentInfoByListing = {},
}: Props) {
  const router = useRouter();
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>(() =>
    pickInitialListingIds(listings, initialListingNumber)
  );
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedListings = useMemo(
    () => listings.filter((l) => selectedListingIds.includes(l.id)),
    [listings, selectedListingIds]
  );

  const selectedPack = useMemo(
    () => FEATURE_BOOST_PACKS.find((p) => p.productId === selectedPackId) ?? null,
    [selectedPackId]
  );

  const boostableCount = listings.filter((l) => l.canBoost).length;
  const totalPrice =
    selectedPack && selectedListings.length > 0
      ? selectedPack.fallbackPriceTry * selectedListings.length
      : 0;

  const readyToPay = selectedListings.length > 0 && selectedPack != null;

  function toggleListing(id: string) {
    setSelectedListingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setError(null);
  }

  async function handleCheckout() {
    if (!selectedPack || selectedListings.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/feature-boost/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingIds: selectedListings.map((l) => l.id),
          productId: selectedPack.productId,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        token?: string;
        merchantOid?: string;
        message?: string;
      };

      if (!res.ok || !data.ok) {
        setError(data.message ?? "Ödeme başlatılamadı.");
        return;
      }

      if (data.token) {
        if (data.merchantOid) {
          sessionStorage.setItem("feature_boost_merchant_oid", data.merchantOid);
        }
        router.push(
          `/odeme/feature-boost?token=${encodeURIComponent(data.token)}`
        );
        return;
      }

      setError("Ödeme yanıtı geçersiz.");
    } catch {
      setError("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-black text-zinc-900">Henüz ilanınız yok</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-600">
          Önce onaylı bir ilan oluşturun.
        </p>
        <Link
          href="/ilan-ver"
          className="mt-6 inline-flex rounded-xl bg-[#ffc400] px-6 py-3 text-sm font-black text-black hover:bg-[#ffd24d]"
        >
          İlan ver
        </Link>
      </div>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[1fr_17.5rem] lg:items-start lg:gap-6 xl:grid-cols-[1fr_19rem] xl:gap-8">
      <div className="space-y-5 pb-24 lg:pb-0">
        <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-black text-zinc-950 sm:text-base">
              İlanlarınız
            </h2>
            <span className="text-xs font-semibold text-zinc-500">
              {selectedListingIds.length} seçili · {boostableCount} uygun
            </span>
          </div>

          <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3">
            {listings.map((listing) => (
              <FeatureBoostListingCard
                key={listing.id}
                listing={listing}
                selected={selectedListingIds.includes(listing.id)}
                disabled={!listing.canBoost}
                paymentInfo={paymentInfoByListing[listing.id] ?? null}
                onToggle={() => toggleListing(listing.id)}
              />
            ))}
          </ul>

          {boostableCount === 0 ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Onaylı ilan yok.
            </p>
          ) : null}
        </section>

        <section
          className={`rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-5 ${
            selectedListings.length === 0 ? "opacity-60" : ""
          }`}
        >
          <h2 className="mb-3 text-sm font-black text-zinc-950 sm:text-base">
            Paket
          </h2>

          <FeatureBoostPackPicker
            selectedPackId={selectedPackId}
            listingCount={selectedListings.length}
            disabled={selectedListings.length === 0}
            onSelect={(id) => {
              setSelectedPackId(id);
              setError(null);
            }}
          />
        </section>
      </div>

      <div className="hidden lg:block">
        <FeatureBoostOrderSummary
          sticky
          selectedListings={selectedListings}
          selectedPack={selectedPack}
          totalPrice={totalPrice}
          submitting={submitting}
          error={error}
          onCheckout={handleCheckout}
        />
      </div>

      {readyToPay && selectedPack ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 p-3 shadow-[0_-6px_24px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-zinc-500">
                {selectedPack.label} · {selectedListings.length} ilan
              </p>
              <p className="text-xl font-black tabular-nums text-zinc-950">
                {new Intl.NumberFormat("tr-TR", {
                  style: "currency",
                  currency: "TRY",
                }).format(totalPrice)}
              </p>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={handleCheckout}
              className="shrink-0 rounded-xl bg-[#ffc400] px-5 py-3 text-sm font-black text-black disabled:opacity-60"
            >
              {submitting ? "…" : "Öde"}
            </button>
          </div>
          {error ? (
            <p className="mx-auto mt-1.5 max-w-lg text-center text-xs text-red-700">
              {error}
            </p>
          ) : null}
          <PaymentLegalNotice className="mx-auto mt-2 max-w-lg text-center" />
        </div>
      ) : null}
    </div>
  );
}
