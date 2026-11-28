"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EidsGsmConfirm } from "@/components/eids/EidsGsmConfirm";
import { humanizeEidsFailMessage } from "@/lib/eids-ui";
import { toTrMobile10 } from "@/lib/listing-create";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  listingId: string;
  listingNumber?: string | number | null;
  plate?: string | null;
};

export function ListingOwnerEidsCard({
  listingId,
  listingNumber,
  plate,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [accountOk, setAccountOk] = useState(false);
  const [gsmOpen, setGsmOpen] = useState(false);
  const [profileGsm, setProfileGsm] = useState("");
  const returnPath = listingNumber
    ? `/ilan/${listingNumber}`
    : `/ilan/${listingId}`;

  const loadAccount = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: row } = await supabase
        .from("profiles")
        .select("phone, eids_kullanici_kodu")
        .eq("id", user.id)
        .maybeSingle();
      const kk = String(
        (row as { eids_kullanici_kodu?: string | null } | null)
          ?.eids_kullanici_kodu ?? ""
      ).trim();
      const gsm = toTrMobile10(
        String((row as { phone?: string | null } | null)?.phone ?? "")
      );
      if (gsm) setProfileGsm(gsm);
      if (kk) setAccountOk(true);
    } catch {
      /* ignore */
    }
  }, []);

  const verifyPlate = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/eids/verify-vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ listingId }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !body.ok) {
        setErr(
          humanizeEidsFailMessage(body.error) ||
            body.message ||
            body.error ||
            "Plaka doğrulanamadı."
        );
        setBusy(false);
        return;
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "verify_failed");
      setBusy(false);
    }
  }, [listingId, router]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("eids") !== "ok") return;
    void (async () => {
      await loadAccount();
      await verifyPlate();
      const u = new URL(window.location.href);
      u.searchParams.delete("eids");
      u.searchParams.delete("durum");
      u.searchParams.delete("state");
      window.history.replaceState({}, "", u.pathname + u.search);
    })();
  }, [loadAccount, verifyPlate]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void loadAccount();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onVis);
    };
  }, [loadAccount]);

  const startEids = useCallback(
    async (gsm: string) => {
      setBusy(true);
      setErr(null);
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.id) {
          await supabase.from("profiles").update({ phone: gsm }).eq("id", user.id);
        }
        const res = await fetch("/api/eids/start", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: "include",
          body: JSON.stringify({
            source: "web",
            listingId,
            webReturnPath: returnPath,
            gsmNo: gsm,
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
          setErr("e-Devlet adresi alınamadı.");
          setBusy(false);
          return;
        }
        window.location.href = url;
      } catch (e) {
        setErr(e instanceof Error ? e.message : "start_failed");
        setBusy(false);
      }
    },
    [listingId, returnPath]
  );

  const plateLabel = (plate ?? "").trim().toUpperCase();

  return (
    <div className="mx-4 mb-4 rounded-xl border border-zinc-200 bg-white px-4 py-4 text-zinc-900 md:mx-0">
      <p className="text-base font-extrabold">e-Devlet doğrulaması</p>
      <p className="mt-1 text-sm leading-snug text-zinc-700">
        İlan pasifte. Önce cep numarasını kesinleştir, sonra e-Devlet; plaka
        yetkisi ardından kontrol edilir.
      </p>
      {plateLabel ? (
        <p className="mt-2 text-sm font-bold">Plaka: {plateLabel}</p>
      ) : null}
      {err ? (
        <p className="mt-2 text-sm font-semibold text-red-800">{err}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {!accountOk ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setGsmOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            e-Devlet ile doğrula
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void verifyPlate()}
            className="inline-flex rounded-lg bg-[#111111] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Sorgulanıyor…" : "Plakayı doğrula"}
          </button>
        )}
      </div>
      <EidsGsmConfirm
        open={gsmOpen}
        initial={profileGsm}
        busy={busy}
        onCancel={() => setGsmOpen(false)}
        onConfirm={(gsm) => {
          setGsmOpen(false);
          setProfileGsm(gsm);
          void startEids(gsm);
        }}
      />
    </div>
  );
}
