"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { humanizeEidsFailMessage, humanizeEidsLookupError } from "@/lib/eids-ui";

type Props = {
  userId: string;
  initialPhone: string;
  eidsVerified: boolean;
  eidsAd: string | null;
  eidsSoyad: string | null;
  eidsVerifiedAt: string | null;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 shadow-sm transition-colors hover:border-zinc-400 focus:border-[#ffcc00] focus:outline-none focus:ring-2 focus:ring-amber-300/80";
const inputLockedClass =
  "mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-zinc-700";

function digitsOnly(v: string) {
  return v.replace(/\D/g, "");
}

/** Kayıt için kanonik 10 hane 5xxxxxxxxx */
function normalizeTrMobile(raw: string): string | null {
  const d = digitsOnly(raw);
  if (d.length === 10 && d.startsWith("5")) return d;
  if (d.length === 11 && d.startsWith("05")) return d.slice(1);
  if (d.length === 12 && d.startsWith("905")) return d.slice(2);
  if (d.length >= 10) {
    const last10 = d.slice(-10);
    if (last10.startsWith("5")) return last10;
  }
  return null;
}

export function EidsWebPanel({
  userId,
  initialPhone,
  eidsVerified,
  eidsAd,
  eidsSoyad,
  eidsVerifiedAt,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [phone, setPhone] = useState(initialPhone);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [plaka, setPlaka] = useState("");
  const [plateResult, setPlateResult] = useState<string | null>(null);
  const [diag, setDiag] = useState<string | null>(null);
  const locked = eidsVerified;

  const banner = useMemo(() => {
    const eids = sp.get("eids");
    const durum = sp.get("durum");
    if (eids === "ok") {
      return {
        ok: true,
        text: "e-Devlet doğrulaması tamamlandı.",
      };
    }
    if (eids === "fail") {
      return {
        ok: false,
        text: humanizeEidsFailMessage(durum),
      };
    }
    return null;
  }, [sp]);

  useEffect(() => {
    if (banner) {
      setMsg(banner.ok ? banner.text : null);
      setErr(banner.ok ? null : banner.text);
    }
  }, [banner]);

  useEffect(() => {
    setPhone(initialPhone);
  }, [initialPhone]);

  const savePhone = useCallback(async () => {
    if (locked) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    const norm = normalizeTrMobile(phone);
    if (!norm) {
      setErr("Geçerli cep girin (5xxxxxxxxx veya 905xxxxxxxxx).");
      setBusy(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .update({ phone: norm })
      .eq("id", userId);
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    setPhone(norm);
    setMsg(
      `Telefon kaydedildi: ${norm} (e-Devlet’te 90${norm} görünebilir — aynı numara).`
    );
    setBusy(false);
    router.refresh();
  }, [locked, phone, router, userId]);

  const startEids = useCallback(async () => {
    if (locked) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    const norm = normalizeTrMobile(phone);
    if (!norm) {
      setErr("Önce geçerli cep kaydet.");
      setBusy(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    await supabase.from("profiles").update({ phone: norm }).eq("id", userId);

    try {
      const res = await fetch("/api/eids/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          source: "web",
          webReturnPath: "/profil/eids",
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        authUrl?: string;
        goUrl?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setErr(body.message || body.error || `start_${res.status}`);
        setBusy(false);
        return;
      }
      const url = body.authUrl || body.goUrl;
      if (!url) {
        setErr("authUrl yok");
        setBusy(false);
        return;
      }
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "start_failed");
      setBusy(false);
    }
  }, [locked, phone, userId]);

  const lookupPlate = useCallback(async () => {
    setBusy(true);
    setPlateResult(null);
    setErr(null);
    try {
      const res = await fetch("/api/eids/lookup-vehicle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ plakaNo: plaka }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        data?: {
          markaAdi?: string;
          ticariAdi?: string;
          modelYili?: string;
        };
        errors?: string[];
      };
      if (!res.ok || !body.ok) {
        console.warn("[eids lookup-vehicle]", { status: res.status, body, plaka });
        setErr(
          humanizeEidsLookupError({
            status: res.status,
            error: body.error,
            message: body.message,
            errors: body.errors,
          })
        );
        setBusy(false);
        return;
      }
      const d = body.data;
      setPlateResult(
        `Resmi kayıt: ${d?.markaAdi ?? "—"} · ${d?.ticariAdi ?? "—"} · ${d?.modelYili ?? "—"}`
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "lookup_failed");
    }
    setBusy(false);
  }, [plaka]);

  const runDiag = useCallback(async () => {
    setBusy(true);
    setDiag(null);
    try {
      const res = await fetch("/api/eids/diag", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const body = await res.json();
      setDiag(JSON.stringify(body, null, 2));
    } catch (e) {
      setDiag(e instanceof Error ? e.message : "diag_failed");
    }
    setBusy(false);
  }, []);

  const displayName = [eidsAd, eidsSoyad].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      {msg ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {msg}
        </div>
      ) : null}
      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {err}
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">1) Cep telefonu</h2>
        {locked ? (
          <p className="mt-1 text-sm text-zinc-600">
            Doğrulanmış hesap telefonu.
          </p>
        ) : (
          <p className="mt-1 text-sm text-zinc-600">
            e-Devlet’te <strong>905334…</strong> yazsa da uygulamada{" "}
            <strong>5334…</strong> yeterli — aynı hat. Profildeki numara
            e-Devlet hesabındakiyle birebir aynı olmalı.
          </p>
        )}
        <label className="mt-4 block text-sm font-medium text-zinc-800">
          Cep (5xxxxxxxxx)
          <input
            className={locked ? inputLockedClass : inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="5xxxxxxxxx"
            disabled={busy || locked}
            readOnly={locked}
          />
        </label>
        {!locked ? (
          <button
            type="button"
            onClick={() => void savePhone()}
            disabled={busy}
            className="mt-3 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            Telefonu kaydet
          </button>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">
          2) e-Devlet / EİDS kimlik
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Durum:{" "}
          {eidsVerified ? (
            <span className="font-semibold text-emerald-700">Doğrulandı</span>
          ) : (
            <span className="font-semibold text-amber-700">Bekliyor</span>
          )}
        </p>
        {locked ? (
          <div className="mt-4 space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            {displayName ? <p className="font-semibold">{displayName}</p> : null}
            <p>{phone || "—"}</p>
            {eidsVerifiedAt ? (
              <p className="text-xs text-emerald-800">
                {new Date(eidsVerifiedAt).toLocaleString("tr-TR")}
              </p>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void startEids()}
            disabled={busy}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#ffcc00] px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-[#f0c000] disabled:opacity-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/branding/edevlet_icon.png"
              alt=""
              width={22}
              height={22}
              className="h-[22px] w-[22px] object-contain"
            />
            e-Devlet ile doğrula
          </button>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">
          3) Plaka yetkisi
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          {eidsVerified
            ? "Hesap hazır. Plakayı yazıp sorgula."
            : "Önce adım 2 yeşil olmalı."}
        </p>
        <p className="mt-2 text-xs leading-snug text-zinc-500">
          Not: Sadece kendi adına kayıtlı veya e-Devlet’te yetkili göründüğün
          araçları sorgulayabilirsin (ör. malik, eş, anne/baba, çocuk — yetki
          tanımlıysa). Başkasının plakasını sorgulayamazsın.
        </p>
        <label className="mt-4 block text-sm font-medium text-zinc-800">
          Plaka
          <input
            className={inputClass}
            value={plaka}
            onChange={(e) => setPlaka(e.target.value.toLocaleUpperCase("tr"))}
            placeholder="34ABC123"
            disabled={busy || !eidsVerified}
          />
        </label>
        <button
          type="button"
          onClick={() => void lookupPlate()}
          disabled={busy || !eidsVerified || !plaka.trim()}
          className="mt-3 inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
        >
          Plakayı sorgula
        </button>
        {plateResult ? (
          <p className="mt-3 text-sm font-medium text-emerald-800">
            {plateResult}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5">
        <h2 className="text-sm font-semibold text-zinc-800">Teknik teşhis</h2>
        <p className="mt-1 text-xs text-zinc-600">
          Proxy + Bakanlık kapısı. Geliştirici / destek için.
        </p>
        <button
          type="button"
          onClick={() => void runDiag()}
          disabled={busy}
          className="mt-3 inline-flex rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
        >
          Teşhis çalıştır
        </button>
        {diag ? (
          <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-zinc-900 p-3 text-[11px] leading-relaxed text-zinc-100">
            {diag}
          </pre>
        ) : null}
      </section>
    </div>
  );
}
