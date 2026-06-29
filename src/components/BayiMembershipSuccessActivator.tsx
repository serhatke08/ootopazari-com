"use client";

import { useEffect, useState } from "react";

type Props = {
  merchantOid: string | null;
};

export function BayiMembershipSuccessActivator({ merchantOid }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!merchantOid);

  useEffect(() => {
    const oid =
      merchantOid?.trim() ||
      (typeof window !== "undefined"
        ? sessionStorage.getItem("bayi_membership_merchant_oid")
        : null);

    if (!oid) {
      setLoading(false);
      setError(
        "Sipariş numarası bulunamadı. Ödeme alındıysa birkaç dakika içinde üyelik aktifleşir."
      );
      return;
    }

    let cancelled = false;

    async function confirm() {
      try {
        const res = await fetch("/api/payments/bayi-membership/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ merchantOid: oid }),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };

        if (cancelled) return;

        if (!res.ok || !data.ok) {
          setError(
            data.message ??
              "Üyelik henüz aktifleşmedi. Sayfayı yenileyin veya destekle iletişime geçin."
          );
          return;
        }

        setMessage(data.message ?? "Bayi üyeliğiniz aktifleştirildi.");
        sessionStorage.removeItem("bayi_membership_merchant_oid");
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
        Ödeme doğrulanıyor, bayi üyeliğiniz aktifleştiriliyor…
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
