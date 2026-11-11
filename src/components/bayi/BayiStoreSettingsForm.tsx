"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BayiApplication, DealerType } from "@/lib/bayi-types";
import { dealerTheme } from "@/lib/dealer-theme";

type City = { id: string; name: string };

type Props = {
  dealerType: DealerType;
  application: BayiApplication;
  cities: City[];
};

export function BayiStoreSettingsForm({ dealerType, application, cities }: Props) {
  const router = useRouter();
  const theme = dealerTheme(dealerType);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [form, setForm] = useState({
    dealer_name: application.dealer_name ?? "",
    contact_phone: application.contact_phone ?? "",
    whatsapp_phone: application.whatsapp_phone ?? "",
    city_id: application.city_id ?? "",
    description: application.description ?? "",
    working_hours: application.working_hours ?? "",
    authorized_brands: application.authorized_brands ?? "",
    full_address: application.full_address ?? "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setOk(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/bayi/application", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealer_type: dealerType,
          ...form,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Kaydedilemedi");
      setOk(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:bg-white";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
          Mağaza
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900">
          Vitrin bilgileri
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Logo, kapak ve adres ödemeden sonra buradan yönetilir. Galeri kartında şehir ve en fazla 3 marka görünür.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-700">
          Bayi adı
          <input
            required
            className={`mt-1.5 ${fieldClass}`}
            value={form.dealer_name}
            onChange={(e) => set("dealer_name", e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Telefon
          <input
            required
            className={`mt-1.5 ${fieldClass}`}
            value={form.contact_phone}
            onChange={(e) => set("contact_phone", e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          WhatsApp
          <input
            className={`mt-1.5 ${fieldClass}`}
            value={form.whatsapp_phone}
            onChange={(e) => set("whatsapp_phone", e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Şehir
          <select
            required
            className={`mt-1.5 ${fieldClass}`}
            value={form.city_id}
            onChange={(e) => set("city_id", e.target.value)}
          >
            <option value="">Şehir seçin</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm font-medium text-zinc-700">
        Yetkili markalar
        <input
          className={`mt-1.5 ${fieldClass}`}
          placeholder="BMW, Mercedes, Audi"
          value={form.authorized_brands}
          onChange={(e) => set("authorized_brands", e.target.value)}
        />
        <span className="mt-1 block text-xs text-zinc-500">
          Virgülle ayır. Kartta ilk 3 marka görünür.
        </span>
      </label>

      <label className="block text-sm font-medium text-zinc-700">
        Çalışma saatleri
        <input
          className={`mt-1.5 ${fieldClass}`}
          placeholder="Hafta içi 09:00–19:00"
          value={form.working_hours}
          onChange={(e) => set("working_hours", e.target.value)}
        />
      </label>

      <label className="block text-sm font-medium text-zinc-700">
        Adres
        <input
          className={`mt-1.5 ${fieldClass}`}
          value={form.full_address}
          onChange={(e) => set("full_address", e.target.value)}
        />
      </label>

      <label className="block text-sm font-medium text-zinc-700">
        Kısa açıklama
        <textarea
          rows={4}
          className={`mt-1.5 ${fieldClass}`}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </label>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {ok ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Mağaza kaydedildi.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl px-5 py-3 text-sm font-black text-white disabled:opacity-60"
        style={{ backgroundColor: theme.primary }}
      >
        {saving ? "Kaydediliyor…" : "Mağazayı kaydet"}
      </button>
    </form>
  );
}
