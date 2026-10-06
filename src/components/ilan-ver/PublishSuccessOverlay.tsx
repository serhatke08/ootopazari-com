"use client";

import { useEffect } from "react";
import { ACIL_PACKS } from "@/lib/listing-acil";
import {
  FEATURE_BOOST_PACKS,
  formatTryPrice,
} from "@/lib/listing-feature-boost";

export type PublishedListingPreview = {
  listingRef: string;
  coverUrl: string | null;
  title: string;
  priceLabel: string;
  metaLine: string;
};

type ToastProps = {
  kind: "toast";
  preview: PublishedListingPreview;
  nextHref: string;
  delayMs?: number;
};

type UpsellProps = {
  kind: "upsell";
  preview: PublishedListingPreview;
  onClose: () => void;
  onPickAcil: () => void;
  onPickBoost: () => void;
};

export type PublishSuccessOverlayProps = ToastProps | UpsellProps;

export function PublishSuccessOverlay(props: PublishSuccessOverlayProps) {
  const { preview } = props;
  const delayMs = props.kind === "toast" ? (props.delayMs ?? 2200) : 0;
  const nextHref = props.kind === "toast" ? props.nextHref : "";

  useEffect(() => {
    if (props.kind !== "toast" || !nextHref) return;
    const t = window.setTimeout(() => {
      window.location.href = nextHref;
    }, delayMs);
    return () => window.clearTimeout(t);
  }, [props.kind, nextHref, delayMs]);

  if (props.kind === "toast") {
    const passivePublish = nextHref.includes("passive=");
    return (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
        role="status"
        aria-live="polite"
      >
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
            ✓
          </div>
          <h2 className="mt-4 text-center text-xl font-black tracking-tight text-zinc-950">
            {passivePublish ? "Pasife kaydedildi" : "Yayınlandı!"}
          </h2>
          <p className="mt-1 text-center text-sm text-zinc-600">
            {passivePublish
              ? "Ücretsiz hakkın dolu. İlan pasifte — İlanlarım’dan 199,99 ₺ ile aktifleştir."
              : "İlanın yayına alındı. Paket seçimine yönlendiriliyorsun…"}
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
            <MiniListingCard preview={preview} />
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-none"
              style={{
                width: "100%",
                transformOrigin: "left",
                animation: `publishProgress ${delayMs}ms linear forwards`,
              }}
            />
          </div>
        </div>
        <style>{`
          @keyframes publishProgress {
            from { transform: scaleX(0); }
            to { transform: scaleX(1); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-upsell-title"
    >
      <div className="relative w-full max-w-md rounded-t-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:rounded-2xl">
        <button
          type="button"
          onClick={props.onClose}
          aria-label="Kapat"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-lg font-bold leading-none text-zinc-700 hover:bg-zinc-200"
        >
          ×
        </button>

        <div className="border-b border-zinc-100 px-5 pb-3 pt-5 pr-14">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-base font-bold text-emerald-700">
              ✓
            </span>
            <div>
              <h2
                id="publish-upsell-title"
                className="text-lg font-black tracking-tight text-zinc-950"
              >
                Yayınlandı!
              </h2>
              <p className="text-xs text-zinc-500">
                İlanın yayında. Daha hızlı satmak ister misin?
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <MiniListingCard preview={preview} />
          </div>

          <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Paket seç
          </p>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={props.onPickAcil}
              className="flex w-full items-start gap-3 rounded-xl border-2 border-orange-200 bg-orange-50/80 p-3.5 text-left transition hover:border-orange-400 hover:bg-orange-50 active:scale-[0.99]"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-[10px] font-black text-white">
                ACİL
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-1">
                  <span className="text-sm font-bold text-zinc-900">
                    Acil ilan
                  </span>
                  <span className="text-sm font-extrabold text-orange-700">
                    {ACIL_PACKS.map((p) => `${p.label} ${p.priceTry}₺`).join(
                      " · "
                    )}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-zinc-600">
                  Acil vitrinde öne çıksın, alıcılar daha çabuk görsün.
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={props.onPickBoost}
              className="flex w-full items-start gap-3 rounded-xl border-2 border-indigo-200 bg-indigo-50/80 p-3.5 text-left transition hover:border-indigo-500 hover:bg-indigo-50 active:scale-[0.99]"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-[10px] font-black leading-tight text-white">
                ÖNE
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-1">
                  <span className="text-sm font-bold text-zinc-900">
                    Öne çıkarma
                  </span>
                  <span className="text-sm font-extrabold text-indigo-700">
                    {formatTryPrice(FEATURE_BOOST_PACKS[0].fallbackPriceTry)} –{" "}
                    {formatTryPrice(
                      FEATURE_BOOST_PACKS[FEATURE_BOOST_PACKS.length - 1]
                        .fallbackPriceTry
                    )}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-zinc-600">
                  Ana akışta daha görünür olsun (
                  {FEATURE_BOOST_PACKS.map((p) => p.label).join(" / ")}).
                </span>
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={props.onClose}
            className="mt-4 w-full py-2.5 text-center text-sm font-semibold text-zinc-500 hover:text-zinc-800"
          >
            Şimdilik geç
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniListingCard({ preview }: { preview: PublishedListingPreview }) {
  return (
    <div className="flex gap-3 p-2.5">
      <div className="relative h-20 w-[5.5rem] shrink-0 overflow-hidden rounded-lg bg-zinc-200">
        {preview.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.coverUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-500">
            Fotoğraf
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="line-clamp-2 text-sm font-bold leading-snug text-zinc-900">
          {preview.title || "İlanın"}
        </p>
        {preview.metaLine ? (
          <p className="mt-0.5 truncate text-[11px] text-zinc-500">
            {preview.metaLine}
          </p>
        ) : null}
        <p className="mt-1 text-sm font-extrabold text-[#002776]">
          {preview.priceLabel}
        </p>
        <p className="mt-0.5 text-[10px] font-medium text-zinc-400">
          #{preview.listingRef}
        </p>
      </div>
    </div>
  );
}
