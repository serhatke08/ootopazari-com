"use client";

import Image from "next/image";
import { useState } from "react";
import type { CityRow } from "@/lib/listings-data";
import {
  DEALER_TYPE_META,
  DEALER_TYPE_VALUES,
  type DealerType,
} from "@/lib/dealer-types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const DOCS_BUCKET = "bayi-application-docs";

function fileExt(file: File): string {
  const byName = file.name.split(".").pop()?.trim().toLowerCase() ?? "";
  if (byName) return byName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function BayiApplicationForm({ cities }: { cities: CityRow[] }) {
  const [dealerType, setDealerType] = useState<DealerType>("galeri");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [dealerName, setDealerName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [cityId, setCityId] = useState("");
  const [description, setDescription] = useState("");
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<File | null>(null);
  const [taxPhoto, setTaxPhoto] = useState<File | null>(null);
  const [workplacePhotos, setWorkplacePhotos] = useState<File[]>([]);
  const [signboardPhoto, setSignboardPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const currentMeta = DEALER_TYPE_META[dealerType];
  const fileInfoClass = "text-[11px] text-zinc-500";

  async function uploadSingleFile(
    userId: string,
    file: File,
    tag: string
  ): Promise<string> {
    const supabase = createSupabaseBrowserClient();
    const ext = fileExt(file);
    const safeTag = tag.replace(/[^a-z0-9_-]/gi, "").toLowerCase();
    const path = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${safeTag}.${ext}`;
    const { data, error } = await supabase.storage
      .from(DOCS_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
    if (error) throw new Error(error.message);
    return data.path;
  }

  async function submit() {
    setLoading(true);
    setStatus(null);
    try {
      if (
        !firstName.trim() ||
        !lastName.trim() ||
        !contactPhone.trim() ||
        !dealerName.trim() ||
        !businessAddress.trim() ||
        !cityId.trim() ||
        !idPhoto ||
        !selfiePhoto ||
        !taxPhoto
      ) {
        setStatus({
          type: "err",
          text: "Zorunlu alanları ve belgeleri eksiksiz doldur.",
        });
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus({ type: "err", text: "Devam etmek için giriş yapmalısın." });
        return;
      }

      const idPhotoStoragePath = await uploadSingleFile(user.id, idPhoto, "id");
      const selfieStoragePath = await uploadSingleFile(
        user.id,
        selfiePhoto,
        "selfie"
      );
      const taxDocumentStoragePath = await uploadSingleFile(user.id, taxPhoto, "tax");

      const workplacePhotosJson: string[] = [];
      for (let i = 0; i < workplacePhotos.length; i += 1) {
        const p = await uploadSingleFile(
          user.id,
          workplacePhotos[i],
          `workplace-${i + 1}`
        );
        workplacePhotosJson.push(p);
      }

      const signboardPhotoStoragePath = signboardPhoto
        ? await uploadSingleFile(user.id, signboardPhoto, "signboard")
        : "";

      const res = await fetch("/api/bayi-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealerType,
          firstName,
          lastName,
          contactPhone,
          idPhotoStoragePath,
          selfieStoragePath,
          dealerName,
          taxDocumentStoragePath,
          businessAddress,
          cityId,
          workplacePhotosJson,
          signboardPhotoStoragePath,
          description,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; alreadyPending?: boolean; message?: string }
        | null;

      if (!res.ok || !json?.ok) {
        setStatus({
          type: "err",
          text: json?.message || "Başvuru gönderilemedi. Tekrar dene.",
        });
        return;
      }
      if (json.alreadyPending) {
        setStatus({
          type: "ok",
          text: "Bu tür için zaten bekleyen başvurun var.",
        });
        return;
      }
      setStatus({
        type: "ok",
        text: "Başvurun alındı. İnceleme sonrası sonucu burada göreceksin.",
      });
    } catch {
      setStatus({
        type: "err",
        text: "Bağlantı hatası. Lütfen tekrar dene.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">Bayi Başvurusu</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Bilgilerini ve belgelerini gönder, onay sürecini buradan takip et.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2">
          <Image
            src={currentMeta.iconSrc}
            alt={currentMeta.label}
            width={26}
            height={26}
            className="h-6 w-6 rounded-full object-cover"
          />
          <span className="text-sm font-semibold text-zinc-800">
            {currentMeta.label}
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 sm:p-4">
          <h3 className="mb-3 text-sm font-bold text-zinc-900">Temel Bilgiler</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Bayi Türü *
              </span>
              <select
                id="dealer-type"
                value={dealerType}
                onChange={(e) => setDealerType(e.target.value as DealerType)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              >
                {DEALER_TYPE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {DEALER_TYPE_META[value].label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Şehir *
              </span>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              >
                <option value="">Şehir seç</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name ?? "Şehir"}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Yetkili Adı *
              </span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                placeholder="Ad"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Yetkili Soyadı *
              </span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                placeholder="Soyad"
              />
            </label>

            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Firma/İşletme Adı *
              </span>
              <input
                value={dealerName}
                onChange={(e) => setDealerName(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                placeholder="Firma adı"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Telefon *
              </span>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                placeholder="05xx xxx xx xx"
              />
            </label>

            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Açık Adres *
              </span>
              <textarea
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                placeholder="İşletme açık adresi"
              />
            </label>

            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Ek Açıklama
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                placeholder="İsteğe bağlı açıklama"
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 sm:p-4">
          <h3 className="mb-3 text-sm font-bold text-zinc-900">Belgeler</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Kimlik Ön Yüz Foto *
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setIdPhoto(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-zinc-700 file:mr-2 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-zinc-800"
              />
              <span className={fileInfoClass}>
                {idPhoto ? idPhoto.name : "Dosya seçilmedi"}
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Selfie *
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelfiePhoto(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-zinc-700 file:mr-2 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-zinc-800"
              />
              <span className={fileInfoClass}>
                {selfiePhoto ? selfiePhoto.name : "Dosya seçilmedi"}
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Vergi Levhası *
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setTaxPhoto(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-zinc-700 file:mr-2 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-zinc-800"
              />
              <span className={fileInfoClass}>
                {taxPhoto ? taxPhoto.name : "Dosya seçilmedi"}
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Tabela Fotoğrafı
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSignboardPhoto(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-zinc-700 file:mr-2 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-zinc-800 hover:file:bg-zinc-300"
              />
              <span className={fileInfoClass}>
                {signboardPhoto ? signboardPhoto.name : "Opsiyonel"}
              </span>
            </label>

            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                İş Yeri Fotoğrafları (İsteğe bağlı)
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setWorkplacePhotos(Array.from(e.target.files ?? []))}
                className="block w-full text-sm text-zinc-700 file:mr-2 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-zinc-800 hover:file:bg-zinc-300"
              />
              <span className={fileInfoClass}>
                {workplacePhotos.length > 0
                  ? `${workplacePhotos.length} dosya seçildi`
                  : "Opsiyonel"}
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {loading ? "Gönderiliyor..." : "Başvuruyu Gönder"}
        </button>
        <span className="text-xs text-zinc-500">* Zorunlu alanlar</span>
      </div>

      {status ? (
        <p
          className={`mt-3 text-sm font-medium ${
            status.type === "ok" ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {status.text}
        </p>
      ) : null}
    </section>
  );
}
