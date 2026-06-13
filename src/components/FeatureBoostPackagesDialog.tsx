"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

type Pack = {
  productId: string;
  days: number;
  label: string;
  subtitle: string;
  priceLabel: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  listingLabel: string;
  packs: Pack[];
};

export function FeatureBoostPackagesDialog({
  open,
  onClose,
  listingLabel,
  packs,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-[min(24rem,calc(100vw-2rem))] max-w-full rounded-2xl border border-black/10 bg-white p-0 text-black shadow-xl backdrop:bg-black/50"
    >
      <div className="border-b border-black/10 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Öne çıkarma paketleri</p>
            <p className="mt-0.5 text-xs text-black/55">{listingLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-black/50 hover:bg-black/5 hover:text-black"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="space-y-2 px-4 py-3">
        {packs.map((pack) => (
          <div
            key={pack.productId}
            className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">{pack.label}</p>
              <p className="text-[11px] text-black/55">{pack.subtitle}</p>
            </div>
            <p className="shrink-0 text-sm font-bold tabular-nums text-black">
              {pack.priceLabel}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-black/10 px-4 py-3">
        <p className="text-xs leading-relaxed text-black/60">
          Web ödemeleri PayTR güvenli ödeme altyapısı üzerinden alınacak şekilde
          hazırlanır. Kart bilgileriniz Oto Pazarı tarafından saklanmaz.
        </p>
        <div className="mt-3 grid gap-2">
          <Link
            href="/ilan-one-cikar"
            className="w-full rounded-lg bg-[#ffc400] px-3 py-2 text-center text-sm font-extrabold text-black hover:bg-[#ffd24d]"
          >
            Paket Detayları
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-black/[0.03]"
          >
            Tamam
          </button>
        </div>
      </div>
    </dialog>
  );
}
