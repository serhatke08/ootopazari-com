"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DealerType, BayiApplicationFormData } from "@/lib/bayi-types";
import {
  DEALER_TYPE_LABELS,
  DEALER_MONTHLY_FEES,
} from "@/lib/bayi-types";
import { getMonthlyFeeForType } from "@/lib/bayi-application-status";

type Props = {
  dealerType: DealerType;
  cities: { id: string; name: string }[];
  onSuccess?: () => void;
};

export function BayiApplicationForm({ dealerType, cities, onSuccess }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<BayiApplicationFormData>({
    dealer_type: dealerType,
    first_name: "",
    last_name: "",
    contact_phone: "",
    dealer_name: "",
    city_id: "",
  });

  const monthlyFee = getMonthlyFeeForType(dealerType);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/bayi/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          monthly_fee_amount: monthlyFee,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Başvuru gönderilemedi");
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/bayi/${dealerType}?application_success=1`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">
          {DEALER_TYPE_LABELS[dealerType]} Bayiliği Başvurusu
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Başvurunuz incelendikten sonra bilgilendirileceksiniz.
        </p>
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm font-semibold text-blue-900">
            Aylık üyelik ücreti: ₺{monthlyFee.toLocaleString("tr-TR")}
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {/* Form Fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Ad *
          </label>
          <input
            type="text"
            required
            value={formData.first_name}
            onChange={(e) =>
              setFormData({ ...formData, first_name: e.target.value })
            }
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#ffc400] focus:outline-none focus:ring-2 focus:ring-[#ffc400]/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Soyad *
          </label>
          <input
            type="text"
            required
            value={formData.last_name}
            onChange={(e) =>
              setFormData({ ...formData, last_name: e.target.value })
            }
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#ffc400] focus:outline-none focus:ring-2 focus:ring-[#ffc400]/20"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">
          Bayi Adı *
        </label>
        <input
          type="text"
          required
          value={formData.dealer_name}
          onChange={(e) =>
            setFormData({ ...formData, dealer_name: e.target.value })
          }
          placeholder="Örn: Mehmet Oto Galeri"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#ffc400] focus:outline-none focus:ring-2 focus:ring-[#ffc400]/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">
          İletişim Telefonu *
        </label>
        <input
          type="tel"
          required
          value={formData.contact_phone}
          onChange={(e) =>
            setFormData({ ...formData, contact_phone: e.target.value })
          }
          placeholder="5XX XXX XX XX"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#ffc400] focus:outline-none focus:ring-2 focus:ring-[#ffc400]/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">
          Şehir *
        </label>
        <select
          required
          value={formData.city_id}
          onChange={(e) =>
            setFormData({ ...formData, city_id: e.target.value })
          }
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#ffc400] focus:outline-none focus:ring-2 focus:ring-[#ffc400]/20"
        >
          <option value="">Şehir seçin</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#ffc400] px-6 py-3 font-bold text-black transition hover:bg-[#ffd24d] disabled:opacity-50"
      >
        {loading ? "Gönderiliyor..." : "Başvuruyu Gönder"}
      </button>

      <p className="text-center text-xs text-zinc-500">
        Başvurunuz onaylandıktan sonra ödeme yaparak bayi panelinizi
        aktifleştirebilirsiniz.
      </p>
    </form>
  );
}
