"use client";

import { useEffect, useState } from "react";

type Props = {
  merchantOid: string | null;
};

export function FeatureBoostSuccessActivator({ merchantOid }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!merchantOid);

  useEffect(() => {
    const oid =
      merchantOid?.trim() ||
      (typeof window !== "undefined"
        ? sessionStorage.getItem("feature_boost_merchant_oid")
        : null);

    if (!oid) {
      setLoading(false);
      setError(
        "Sipariş numarası bulunamadı. Ödeme alındıysa birkaç dakika içinde paket tanımlanır veya destekle iletişime geçin."
      );
      return;
    }

    let cancelled = false;

    async function confirm() {
      try {
        const res = await fetch("/api/payments/feature-boost/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ merchantOid: oid }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          message?: string;
          packDays?: number;
        };

        if (cancelled) return;

        if (!res.ok || !data.ok) {
          setError(
            data.message ??
              "Paket henüz tanımlanamadı. Sayfayı yenileyin veya destekle iletişime geçin."
          );
          return;
        }

        setMessage(
          data.message ??
            (data.packDays
              ? `${data.packDays} günlük öne çıkarma aktif.`
              : "Öne çıkarma paketi tanımlandı.")
        );
        sessionStorage.removeItem("feature_boost_merchant_oid");
      } catch {
        if (!cancelled) {
          setError("Bağlantı hatası. Sayfayı yenileyip tekrar deneyin.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void confirm();
    return () => {
      cancelled = true;
    };
  }, [merchantOid]);

  if (loading) {
    return (
      <p className="mt-3 text-sm text-emerald-800">
        Ödeme doğrulanıyor, paket ilanınıza tanımlanıyor…
      </p>
    );
  }

  if (message) {
    return <p className="mt-3 text-sm font-semibold text-emerald-900">{message}</p>;
  }

  if (error) {
    return <p className="mt-3 text-sm text-amber-900">{error}</p>;
  }

  return null;
}
