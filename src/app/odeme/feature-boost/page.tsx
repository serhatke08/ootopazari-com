"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PaymentLegalNotice } from "@/components/PaymentLegalNotice";

function PaytrIframe() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  if (!token) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="font-bold text-zinc-900">Ödeme oturumu bulunamadı</p>
        <p className="mt-2 text-sm text-zinc-600">
          Lütfen ilan seçip paketi yeniden başlatın.
        </p>
        <Link
          href="/ilan-one-cikar"
          className="mt-5 inline-flex rounded-lg bg-[#ffc400] px-5 py-2.5 text-sm font-black text-black hover:bg-[#ffd24d]"
        >
          İlan Öne Çıkar
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <iframe
        src={`https://www.paytr.com/odeme/guvenli/${token}`}
        title="PayTR güvenli ödeme"
        className="h-[min(720px,80vh)] w-full border-0"
        allow="payment"
      />
    </div>
  );
}

export default function FeatureBoostPaymentPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-950">Güvenli ödeme</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Dijital hizmet — fiziksel kargo yok. Kart bilgileriniz PayTR
            altyapısı üzerinden işlenir.
          </p>
        </div>
        <Image
          src="/paytr-logo.svg"
          alt="PayTR"
          width={120}
          height={32}
          className="h-8 w-auto"
        />
      </div>
      <div className="mt-6">
        <Suspense
          fallback={
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
              Ödeme ekranı yükleniyor…
            </div>
          }
        >
          <PaytrIframe />
        </Suspense>
      </div>
      <PaymentLegalNotice className="mt-6" />
      <p className="mt-4 text-center text-xs text-zinc-500">
        <Link href="/iletisim" className="underline">
          İletişim ve satıcı bilgileri
        </Link>
      </p>
    </div>
  );
}
