"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FeatureBoostListingOption } from "@/lib/feature-boost-listing";
import {
  FEATURE_BOOST_PACKS,
  formatTryPrice,
} from "@/lib/listing-feature-boost";

type Pack = (typeof FEATURE_BOOST_PACKS)[number];

type Props = {
  listings: FeatureBoostListingOption[];
  initialListingNumber?: string | null;
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
  const first = listings.find((l) => l.canBoost);
  return first ? [first.id] : [];
}

function formatListingPrice(price: number | null): string {
  if (price == null) return "Fiyat yok";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(price);
}

export function FeatureBoostCheckout({
  listings,
  initialListingNumber,
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
    () =>
      FEATURE_BOOST_PACKS.find((p) => p.productId === selectedPackId) ?? null,
    [selectedPackId]
  );

  const boostableCount = listings.filter((l) => l.canBoost).length;
  const totalPrice =
    selectedPack && selectedListings.length > 0
      ? selectedPack.fallbackPriceTry * selectedListings.length
      : 0;

  function toggleListing(id: string) {
    setSelectedListingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setError(null);
  }

  async function handleCheckout() {
    if (selectedListings.length === 0 || !selectedPack) return;

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
        code?: string;
      };

      if (!res.ok || !data.ok) {
        setError(
          data.message ??
            "Ödeme başlatılamadı. Lütfen tekrar deneyin veya destek ile iletişime geçin."
        );
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
      setError("Bağlantı hatası. İnternetinizi kontrol edip tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-bold text-zinc-900">Henüz ilanınız yok</p>
        <p className="mt-2 text-sm text-zinc-600">
          Öne çıkarma satın almak için önce bir ilan oluşturmanız gerekir.
        </p>
        <Link
          href="/ilan-ver"
          className="mt-5 inline-flex rounded-lg bg-[#ffc400] px-5 py-2.5 text-sm font-black text-black hover:bg-[#ffd24d]"
        >
          İlan Ver
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-zinc-950">1. İlan seç</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Birden fazla ilan seçebilirsiniz. Aktif öne çıkarmaya ek paket
              süreyi üstüne ekler.
            </p>
          </div>
          <p className="text-xs font-semibold text-zinc-500">
            {selectedListingIds.length} seçili · {boostableCount} /{" "}
            {listings.length} uygun
          </p>
        </div>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => {
            const selected = selectedListingIds.includes(listing.id);
            const disabled = !listing.canBoost;

            return (
              <li key={listing.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    toggleListing(listing.id);
                  }}
                  className={`w-full overflow-hidden rounded-xl border text-left transition ${
                    disabled
                      ? "cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-70"
                      : selected
                        ? "border-[#ffc400] bg-amber-50 ring-2 ring-[#ffc400]/40"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                  }`}
                >
                  <div className="relative aspect-[16/10] bg-zinc-100">
                    {listing.coverImageUrl ? (
                      <Image
                        src={listing.coverImageUrl}
                        alt={listing.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                        Görsel yok
                      </div>
                    )}
                    {selected ? (
                      <span className="absolute right-2 top-2 rounded-full bg-[#ffc400] px-2 py-0.5 text-[10px] font-black text-black">
                        Seçili
                      </span>
                    ) : null}
                    {listing.isBoostActive ? (
                      <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-bold text-[#ffc400]">
                        Öne çıkıyor
                      </span>
                    ) : null}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-bold text-zinc-900">
                      {listing.title}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      #{listing.listingNumber}
                      {listing.cityName ? ` · ${listing.cityName}` : ""}
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-800">
                      {formatListingPrice(listing.price)}
                    </p>
                    {listing.blockReason ? (
                      <p className="mt-2 text-[11px] leading-snug text-amber-800">
                        {listing.blockReason}
                      </p>
                    ) : listing.isBoostActive && listing.boostEndLabel ? (
                      <p className="mt-2 text-[11px] font-semibold leading-snug text-amber-900">
                        Bitiş: {listing.boostEndLabel}
                        {listing.packDays > 0
                          ? ` · ${listing.packDays} gün paket`
                          : ""}
                      </p>
                    ) : (
                      <p className="mt-2 text-[11px] font-semibold text-emerald-700">
                        Öne çıkarmaya uygun
                      </p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {boostableCount === 0 ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Şu an öne çıkarılabilecek ilanınız yok. İlanlarınız onaylandıktan
            sonra buradan paket satın alabilirsiniz.
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-black text-zinc-950">2. Paket seç</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {selectedListings.length > 0
            ? `${selectedListings.length} ilan için paket seçin. Aktif ilana alınan paket mevcut sürenin üzerine eklenir.`
            : "Önce yukarıdan en az bir ilan seçin."}
        </p>

        {selectedListings.length === 0 ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Paketleri görmek için önce onaylı ve uygun bir ilan seçmelisiniz.
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_BOOST_PACKS.map((pack: Pack) => {
            const selected = selectedPackId === pack.productId;
            const inactive = selectedListings.length === 0;

            return (
              <button
                key={pack.productId}
                type="button"
                onClick={() => {
                  if (selectedListings.length === 0) {
                    setError("Önce en az bir ilan seçin.");
                    return;
                  }
                  setSelectedPackId(pack.productId);
                  setError(null);
                }}
                className={`rounded-xl border p-4 text-left transition ${
                  inactive
                    ? "border-zinc-200 bg-zinc-50"
                    : selected
                      ? "border-[#ffc400] bg-amber-50 ring-2 ring-[#ffc400]/40"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                }`}
              >
                <p className="text-base font-black text-zinc-950">
                  {pack.label}
                </p>
                <p className="mt-1 text-xs text-zinc-600">{pack.subtitle}</p>
                <p className="mt-3 text-xl font-black tabular-nums text-zinc-950">
                  {formatTryPrice(pack.fallbackPriceTry)}
                  {selectedListings.length > 1 ? (
                    <span className="ml-1 text-xs font-semibold text-zinc-500">
                      / ilan
                    </span>
                  ) : null}
                </p>
              </button>
            );
          })}
        </div>

        {error && !selectedPack ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}
      </section>

      {selectedListings.length > 0 && selectedPack ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black text-zinc-950">Özet</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-600">İlanlar</dt>
              <dd className="max-w-[60%] text-right font-semibold text-zinc-900">
                {selectedListings.length === 1 ? (
                  <>
                    #{selectedListings[0].listingNumber} ·{" "}
                    {selectedListings[0].title}
                  </>
                ) : (
                  `${selectedListings.length} ilan seçildi`
                )}
              </dd>
            </div>
            {selectedListings.length > 1 ? (
              <ul className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                {selectedListings.map((listing) => (
                  <li key={listing.id} className="py-0.5">
                    #{listing.listingNumber} · {listing.title}
                    {listing.isBoostActive && listing.boostEndLabel
                      ? ` (bitiş: ${listing.boostEndLabel})`
                      : ""}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-600">Paket</dt>
              <dd className="font-semibold text-zinc-900">
                {selectedPack.label} — {selectedPack.subtitle}
              </dd>
            </div>
            {selectedListings.some((l) => l.isBoostActive) ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Seçili ilanlardan en az biri zaten öne çıkıyor. Bu ödeme
                paketi mevcut kampanyanın üzerine eklenecek; kalan süre
                kaybolmaz.
              </p>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-zinc-100 pt-3">
              <dt className="font-bold text-zinc-900">Toplam</dt>
              <dd className="text-xl font-black tabular-nums text-zinc-950">
                {formatTryPrice(totalPrice)}
              </dd>
            </div>
          </dl>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={submitting}
            onClick={handleCheckout}
            className="mt-5 w-full rounded-xl bg-[#ffc400] px-4 py-3.5 text-sm font-black text-black transition hover:bg-[#ffd24d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Yönlendiriliyor…" : "Ödemeye geç"}
          </button>
          <p className="mt-3 text-center text-xs text-zinc-500">
            Kart bilgileriniz PayTR güvenli ödeme sayfasında alınır.
          </p>
        </section>
      ) : null}
    </div>
  );
}
