"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { friendlyAuthError } from "@/lib/auth-errors";
import { GoogleIcon } from "@/components/GoogleIcon";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 shadow-sm transition-colors hover:border-zinc-400 hover:bg-white focus:border-[#ffcc00] focus:outline-none focus:ring-2 focus:ring-amber-300/80";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get("next");
  const next = nextRaw?.startsWith("/") ? nextRaw : "/";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  /** Kayıt tamam; e-posta ile doğrulama bekleniyor */
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false);
  const [sentToEmail, setSentToEmail] = useState("");

  async function signUpWithGoogle() {
    setError(null);
    setOauthLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (err) {
        setError(friendlyAuthError(err.message));
      }
    } finally {
      setOauthLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn) {
      setError("Ad girin.");
      return;
    }
    if (!ln) {
      setError("Soyad girin.");
      return;
    }
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı.");
      return;
    }
    if (password !== passwordAgain) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    const phoneTrim = phone.trim();
    if (!phoneTrim) {
      setError("Telefon numarası girin.");
      return;
    }

    const emailTrim = email.trim();

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const fullName = `${fn} ${ln}`.trim();
      const { data, error: err } = await supabase.auth.signUp({
        email: emailTrim,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          data: {
            first_name: fn,
            last_name: ln,
            full_name: fullName,
            phone: phoneTrim,
          },
        },
      });
      if (err) {
        setError(friendlyAuthError(err.message));
        return;
      }
      if (data.session) {
        router.refresh();
        router.push(next);
        return;
      }
      setSentToEmail(emailTrim);
      setAwaitingEmailConfirm(true);
    } finally {
      setLoading(false);
    }
  }

  if (awaitingEmailConfirm) {
    return (
      <div className="max-w-md rounded-xl border-2 border-[#ffcc00] bg-amber-50/90 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80">
          E-posta onayı
        </p>
        <h2 className="mt-2 text-lg font-semibold text-zinc-900">
          Hesabınızı doğrulayın
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-700">
          <span className="break-all font-medium text-zinc-900">
            {sentToEmail}
          </span>{" "}
          adresine bir onay bağlantısı gönderdik. Gelen kutunuzu ve gerekiyorsa
          spam / promosyon klasörünü kontrol edin. Bağlantıya tıkladıktan sonra
          giriş yapabilirsiniz.
        </p>
        <p className="mt-4 text-sm text-zinc-600">
          E-posta gelmediyse birkaç dakika bekleyip tekrar deneyin veya kayıt
          sırasında adresi doğru yazdığınızdan emin olun.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={`/giris?next=${encodeURIComponent(next)}`}
            className="inline-flex justify-center rounded-lg bg-[#ffcc00] px-4 py-2.5 text-center text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-amber-300"
          >
            Giriş sayfasına git
          </Link>
          <Link
            href="/"
            className="text-center text-sm font-medium text-emerald-700 underline-offset-2 hover:text-emerald-600 hover:underline sm:ml-2"
          >
            Ana sayfa
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        Ad
        <input
          type="text"
          name="firstName"
          autoComplete="given-name"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        Soyad
        <input
          type="text"
          name="lastName"
          autoComplete="family-name"
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        E-posta
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        Şifre (en az 6 karakter)
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        Şifre tekrar
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={passwordAgain}
          onChange={(e) => setPasswordAgain(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        Telefon
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="Örn. 05xx xxx xx xx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
        />
      </label>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={loading || oauthLoading}
        className="rounded-lg bg-[#ffcc00] px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-amber-300 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-60"
      >
        {loading ? "Kaydediliyor…" : "Kayıt ol"}
      </button>
      <div className="relative py-1">
        <div className="h-px w-full bg-zinc-200" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-zinc-500">
          veya
        </span>
      </div>
      <button
        type="button"
        onClick={() => void signUpWithGoogle()}
        disabled={loading || oauthLoading}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a73e8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1765cc] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#1a73e8]/50 disabled:opacity-60"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white">
          <GoogleIcon className="h-4 w-4" />
        </span>
        {oauthLoading ? "Google yönlendiriliyor…" : "Google ile devam et"}
      </button>
      <p className="text-sm text-zinc-600">
        Zaten hesabınız var mı?{" "}
        <Link
          href={`/giris?next=${encodeURIComponent(next)}`}
          className="font-medium text-emerald-700 underline-offset-2 transition-colors hover:text-emerald-600 hover:underline"
        >
          Giriş yapın
        </Link>
      </p>
    </form>
  );
}
