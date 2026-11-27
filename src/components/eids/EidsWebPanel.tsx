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
  const [transferState, setTransferState] = useState<string | null>(null);
  const locked = eidsVerified;

  const banner = useMemo(() => {
    const eids = sp.get("eids");
    const durum = sp.get("durum");
    const state = sp.get("state");
    if (eids === "ok") {
      return {
        ok: true,
        text: "e-Devlet doğrulaması tamamlandı.",
        transferState: null as string | null,
      };
    }
    if (eids === "fail") {
      return {
        ok: false,
        text: humanizeEidsFailMessage(durum),
        transferState:
          durum === "eids_already_linked" && state ? state : null,
      };
    }
    return null;
  }, [sp]);

  useEffect(() => {
    if (banner) {
      setMsg(banner.ok ? banner.text : null);
      setErr(banner.ok ? null : banner.text);
      setTransferState(banner.transferState);
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

  const transferEids = useCallback(async () => {
    if (!transferState) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/eids/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ state: transferState }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !body.ok) {
        setErr(body.message || body.error || `transfer_${res.status}`);
        setBusy(false);
        return;
      }
      setTransferState(null);
      setErr(null);
      setMsg("e-Devlet bu hesaba taşındı.");
      setBusy(false);
      router.replace("/profil/eids");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "transfer_failed");
      setBusy(false);
    }
  }, [router, transferState]);

  const unbindEids = useCallback(async () => {
    if (!locked) return;
    const ok = window.confirm(
      "e-Devlet bağı bu hesaptan kalkacak. İlan vermek için tekrar doğrulaman gerekir."
    );
    if (!ok) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/eids/unbind", {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setErr(body.error || `unbind_${res.status}`);
        setBusy(false);
        return;
      }
      setMsg("e-Devlet bağı kaldırıldı.");
      setBusy(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "unbind_failed");
      setBusy(false);
    }
  }, [locked, router]);

  const startEids = useCallback(async () => {
    if (locked) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    const norm = normalizeTrMobile(phone);
    if (norm) {
      const supabase = createSupabaseBrowserClient();
      await supabase.from("profiles").update({ phone: norm }).eq("id", userId);
    }

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
          <p>{err}</p>
          {transferState ? (
            <button
              type="button"
              onClick={() => void transferEids()}
              disabled={busy}
              className="mt-3 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              Bu hesaba taşı
            </button>
          ) : null}
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
            İsteğe bağlı. e-Devlet doğrulaması için telefon şart değil.
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
          <div className="mt-4 space-y-3">
            <div className="space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
              {displayName ? <p className="font-semibold">{displayName}</p> : null}
              <p>{phone || "—"}</p>
              {eidsVerifiedAt ? (
                <p className="text-xs text-emerald-800">
                  {new Date(eidsVerifiedAt).toLocaleString("tr-TR")}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void unbindEids()}
              disabled={busy}
              className="text-sm font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900 disabled:opacity-50"
            >
              e-Devlet bağını kaldır
            </button>
          </div>
        ) : (
          <>
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
            <p className="mt-3 text-xs font-medium leading-snug text-zinc-500">
              Bir e-Devlet hesabı yalnızca bir Oto Pazarı hesabına bağlanabilir.
              Aynı e-Devlet ile ikinci hesap doğrulanamaz.
            </p>
          </>
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
          Not: Kendi aracın; eş, 1. derece (anne, baba, çocuk) ve 2. derece
          (kardeş, dede, nine, torun); e-Devlet’te seni yetkilendirenler;
          galeri için araç sahibi yetki belgesi numarasıyla izin verdiyse.
          Yetkin yoksa Ticaret Bakanlığı sorguyu reddeder.
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
    </div>
  );
}
