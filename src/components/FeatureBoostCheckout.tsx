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
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">
          📋
        </div>
        <p className="text-xl font-black text-zinc-900">Henüz ilanınız yok</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-600">
          Öne çıkarma satın almak için önce onaylı bir ilan oluşturun.
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
    <div className="lg:grid lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-8 xl:grid-cols-[1fr_24rem]">
      <div className="space-y-6 pb-28 lg:pb-0">
        {/* Adım 1 */}
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-black text-white">
                1
              </span>
              <div>
                <h2 className="text-lg font-black text-zinc-950 sm:text-xl">
                  İlan seçin
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                  Birden fazla ilan işaretleyebilirsiniz. Aktif öne çıkarmaya
                  ek paket süreyi uzatır.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                {selectedListingIds.length} seçili
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                {boostableCount} uygun
              </span>
            </div>
          </div>

          <ul className="mt-5 space-y-3">
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
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Onaylı ilanınız olmadığı için şu an öne çıkarma satın alınamaz.
            </p>
          ) : null}
        </section>

        {/* Adım 2 */}
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-black text-white">
              2
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black text-zinc-950 sm:text-xl">
                Paket seçin
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                {selectedListings.length > 0
                  ? `${selectedListings.length} ilan için süre paketi`
                  : "Önce en az bir ilan seçin"}
              </p>
            </div>
          </div>

          {selectedListings.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
              Paketleri görmek için yukarıdan ilan seçin.
            </p>
          ) : (
            <div className="mt-5">
              <FeatureBoostPackPicker
                selectedPackId={selectedPackId}
                listingCount={selectedListings.length}
                disabled={selectedListings.length === 0}
                onSelect={(id) => {
                  setSelectedPackId(id);
                  setError(null);
                }}
              />
            </div>
          )}

          {error && !readyToPay ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}
        </section>
      </div>

      {/* Özet — masaüstü sağ kolon */}
      {readyToPay && selectedPack ? (
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
      ) : null}

      {/* Mobil sabit ödeme çubuğu */}
      {readyToPay && selectedPack ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-zinc-500">
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
              className="shrink-0 rounded-xl bg-[#ffc400] px-5 py-3.5 text-sm font-black text-black disabled:opacity-60"
            >
              {submitting ? "…" : "Öde"}
            </button>
          </div>
          {error ? (
            <p className="mx-auto mt-2 max-w-lg text-center text-xs text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
