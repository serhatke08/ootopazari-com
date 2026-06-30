"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentLegalNotice } from "@/components/PaymentLegalNotice";
import type { DealerType } from "@/lib/bayi-types";

type Props = {
  dealerType: DealerType;
  label?: string;
  className?: string;
};

export function BayiMembershipPayButton({
  dealerType,
  label = "Ödeme Yap",
  className = "rounded-lg bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/bayi-membership/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealerType }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        token?: string;
        merchantOid?: string;
        message?: string;
      };
      if (!res.ok || !data.ok || !data.token) {
        setError(data.message ?? "Ödeme başlatılamadı.");
        return;
      }
      if (data.merchantOid) {
        sessionStorage.setItem("bayi_membership_merchant_oid", data.merchantOid);
      }
      router.push(`/odeme/feature-boost?token=${encodeURIComponent(data.token)}`);
    } catch {
      setError("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className={className}
      >
        {loading ? "Yönlendiriliyor…" : label}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-red-700">{error}</p>
      ) : null}
      <PaymentLegalNotice className="mt-3" />
    </div>
  );
}
