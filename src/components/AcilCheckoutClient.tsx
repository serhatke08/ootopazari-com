"use client";

import { useMemo, useState } from "react";
import { ACIL_PACKS } from "@/lib/listing-acil";
import { formatTryPrice } from "@/lib/listing-feature-boost";

type ListingOpt = {
  id: string;
  listingNumber: string;
  title: string;
  coverImageUrl: string | null;
  price: number | null;
};

type Props = {
  listings: ListingOpt[];
  initialListingKey?: string | null;
  initialPackId?: string | null;
};

export function AcilCheckoutClient({
  listings,
  initialListingKey,
  initialPackId,
}: Props) {
  const initial = useMemo(() => {
    if (!initialListingKey) return listings[0]?.id ?? "";
    const key = initialListingKey.trim();
    return (
      listings.find((l) => l.id === key || l.listingNumber === key)?.id ??
      listings[0]?.id ??
      ""
    );
  }, [listings, initialListingKey]);

  const [listingId, setListingId] = useState(initial);
  /** Paket seçilmeden 0 ₺ / buton pasif. */
  const [packId, setPackId] = useState<string>(() => {
    const key = initialPackId?.trim() ?? "";
    if (!key) return "";
    return ACIL_PACKS.some((p) => p.productId === key) ? key : "";
  });
  const [msg, setMsg] = useState<string | null>(null);

  const selected = listings.find((l) => l.id === listingId) ?? null;
  const pack = ACIL_PACKS.find((p) => p.productId === packId) ?? null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <p className="mb-2 text-sm font-bold text-zinc-900">İlan</p>
        {listings.length === 0 ? (
          <p className="text-sm text-zinc-600">Yayında ilanın yok.</p>
        ) : (
          <select
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
          >
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                #{l.listingNumber} · {l.title}
              </option>
            ))}
          </select>
        )}
        {selected?.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selected.coverImageUrl}
            alt=""
            className="mt-3 h-28 w-full rounded-lg object-cover"
          />
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold text-zinc-900">Paket seç</p>
        {ACIL_PACKS.map((p) => (
          <button
            key={p.productId}
            type="button"
            onClick={() =>
              setPackId((prev) => (prev === p.productId ? "" : p.productId))
            }
            className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition ${
              packId === p.productId
                ? "border-orange-500 bg-orange-50"
                : "border-zinc-200 bg-white hover:bg-zinc-50"
            }`}
          >
            <span className="text-sm font-semibold text-zinc-900">
              {p.label} Acil
            </span>
            <span className="text-sm font-extrabold text-orange-700">
              {formatTryPrice(p.priceTry)}
            </span>
          </button>
        ))}
      </div>

      {msg ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {msg}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!selected || !pack}
        onClick={() => {
          setMsg(
            "İlanın yayınlandı. Acil vitrin web ödemesi kısa süre içinde açılacak; şimdilik uygulamadan aynı paketi satın alabilirsin."
          );
        }}
        className="w-full rounded-lg bg-orange-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {pack
          ? `Öde · ${formatTryPrice(pack.priceTry)}`
          : "Öde · 0 ₺"}
      </button>

      <p className="text-center text-xs text-zinc-500">
        İlan zaten yayında. Ödeme tamamlanınca acil vitrin süresi başlar.
      </p>
    </div>
  );
}
