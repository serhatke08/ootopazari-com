"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const APP_SCHEME = "io.supabase.flutter://login-callback";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const urlError = searchParams.get("error");

    async function boot() {
      if (urlError) {
        if (!cancelled) setExpired(true);
        return;
      }

      if (tokenHash) {
        const { error: otpErr } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });
        if (cancelled) return;
        if (otpErr) {
          setExpired(true);
          return;
        }
        setReady(true);
        return;
      }

      if (code) {
        const { error: exchErr } =
          await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled && !exchErr) {
          setReady(true);
          return;
        }
        const appUrl = `${APP_SCHEME}?code=${encodeURIComponent(code)}`;
        window.location.href = appUrl;
        window.setTimeout(() => {
          if (!cancelled) setExpired(true);
        }, 1800);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        setReady(true);
        return;
      }
      if (type === "recovery" || window.location.hash.includes("access_token")) {
        window.setTimeout(async () => {
          if (cancelled) return;
          const againSession = await supabase.auth.getSession();
          if (againSession.data.session) {
            setReady(true);
            return;
          }
          setExpired(true);
        }, 400);
        return;
      }
      setExpired(true);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı.");
      return;
    }
    if (password !== again) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) {
        setError(updErr.message || "Şifre güncellenemedi.");
        return;
      }
      await supabase.auth.signOut();
      router.replace("/giris?reset=ok");
    } finally {
      setSaving(false);
    }
  }

  if (expired) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold text-zinc-900">
          Bağlantı geçersiz
        </h1>
        <p className="text-sm text-zinc-600">
          Sıfırlama bağlantısının süresi dolmuş veya tarayıcı uygulamayı
          açamadı. Yeni bir bağlantı iste veya Oto Pazarı uygulamasını aç.
        </p>
        <a
          href="/giris"
          className="rounded-lg bg-[#ffcc00] px-4 py-2.5 text-center text-sm font-semibold text-zinc-900"
        >
          Girişe dön
        </a>
      </div>
    );
  }

  if (!ready) {
    return (
      <p className="text-center text-sm text-zinc-500">Bağlantı doğrulanıyor…</p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-zinc-900">Yeni şifre belirle</h1>
      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        Yeni şifre
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-[#ffcc00] focus:outline-none focus:ring-2 focus:ring-amber-300/80"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        Yeni şifre tekrar
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={again}
          onChange={(e) => setAgain(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-[#ffcc00] focus:outline-none focus:ring-2 focus:ring-amber-300/80"
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-[#ffcc00] px-4 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-60"
      >
        {saving ? "Kaydediliyor…" : "Şifreyi kaydet"}
      </button>
    </form>
  );
}
