"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  email: string;
};

const DELETE_CONFIRM_TEXT = "HESABIMI SIL";

export function AccountSettingsPanel({ email }: Props) {
  const router = useRouter();
  const [deleteText, setDeleteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<string | null>(null);

  async function sendResetEmail() {
    setResetInfo(null);
    setDeleteErr(null);
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/giris`,
      });
      if (error) {
        setDeleteErr(error.message || "Sıfırlama e-postası gönderilemedi.");
        return;
      }
      setResetInfo("Şifre sıfırlama e-postası gönderildi.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (deleteText.trim().toUpperCase() !== DELETE_CONFIRM_TEXT) {
      setDeleteErr(`Lütfen onay metnini tam yaz: ${DELETE_CONFIRM_TEXT}`);
      return;
    }
    setDeleteErr(null);
    setResetInfo(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: deleteText }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;
      if (!res.ok || !json?.ok) {
        setDeleteErr(
          json?.message || "Hesap silinemedi. Lütfen tekrar deneyin."
        );
        return;
      }
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.refresh();
      router.push("/?account_deleted=1");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 grid gap-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">Hesap bilgileri</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Giriş e-postanız aşağıdadır.
        </p>
        <div className="mt-3 rounded-xl bg-zinc-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            E-posta
          </p>
          <p className="mt-0.5 break-all text-sm font-medium text-zinc-800">
            {email}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">Güvenlik</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Şifrenizi unuttuysanız e-posta ile sıfırlama bağlantısı gönderebilirsiniz.
        </p>
        <button
          type="button"
          onClick={() => void sendResetEmail()}
          disabled={busy}
          className="mt-3 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
        >
          Şifre sıfırlama e-postası gönder
        </button>
        {resetInfo ? (
          <p className="mt-2 text-sm text-emerald-700">{resetInfo}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50/60 p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-red-900">Tehlikeli alan</h2>
        <p className="mt-1 text-sm text-red-800/90">
          Hesabınızı sildiğinizde giriş yapamazsınız. İşlem geri alınamaz.
        </p>

        <label className="mt-3 block text-sm font-medium text-red-900">
          Onay için <span className="font-bold">{DELETE_CONFIRM_TEXT}</span> yazın
          <input
            type="text"
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            className="mt-1 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-zinc-900"
            placeholder={DELETE_CONFIRM_TEXT}
          />
        </label>

        <button
          type="button"
          onClick={() => void deleteAccount()}
          disabled={busy}
          className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
        >
          {busy ? "İşleniyor…" : "Hesabımı sil"}
        </button>

        {deleteErr ? (
          <p className="mt-2 text-sm text-red-700">{deleteErr}</p>
        ) : null}
      </section>
    </div>
  );
}
