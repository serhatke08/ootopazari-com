"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { friendlyAuthError } from "@/lib/auth-errors";
import { GoogleIcon } from "@/components/GoogleIcon";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function buildOAuthRedirectTo(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const base = fromEnv && fromEnv !== "" ? fromEnv : window.location.origin;
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(base)
    ? base
    : `https://${base}`;
  return new URL("/auth/callback", withProtocol).toString();
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get("next");
  const oauthErrorRaw = searchParams.get("error");
  const next = nextRaw?.startsWith("/") ? nextRaw : "/";
  const oauthError =
    oauthErrorRaw && oauthErrorRaw.trim()
      ? friendlyAuthError(decodeURIComponent(oauthErrorRaw))
      : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  async function signInWithGoogle() {
    if (oauthLoading || loading) return;
    setError(null);
    setOauthLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = buildOAuthRedirectTo();
      const oauthOptions = {
        provider: "google" as const,
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account",
          },
        },
      };

      let { data, error: err } = await supabase.auth.signInWithOAuth(oauthOptions);

      const msg = String(err?.message ?? "").toLowerCase();
      const staleToken =
        msg.includes("refresh token") ||
        msg.includes("invalid refresh") ||
        msg.includes("jwt");

      if (err && staleToken) {
        await supabase.auth.signOut({ scope: "local" });
        ({ data, error: err } = await supabase.auth.signInWithOAuth(oauthOptions));
      }

      if (err) {
        setError(friendlyAuthError(err.message));
        return;
      }
      if (data?.url && typeof window !== "undefined") {
        window.location.assign(data.url);
      }
    } finally {
      setOauthLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) {
        setError(friendlyAuthError(err.message));
        return;
      }
      router.refresh();
      router.push(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        E-posta
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 shadow-sm transition-colors hover:border-zinc-400 hover:bg-white focus:border-[#ffcc00] focus:outline-none focus:ring-2 focus:ring-amber-300/80"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        Şifre
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 shadow-sm transition-colors hover:border-zinc-400 hover:bg-white focus:border-[#ffcc00] focus:outline-none focus:ring-2 focus:ring-amber-300/80"
        />
      </label>
      {error || oauthError ? (
        <p className="text-sm text-red-600">{error ?? oauthError}</p>
      ) : null}
      <button
        type="submit"
        disabled={loading || oauthLoading}
        className="rounded-lg bg-[#ffcc00] px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-amber-300 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-60"
      >
        {loading ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
      <div className="relative py-1">
        <div className="h-px w-full bg-zinc-200" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-zinc-500">
          veya
        </span>
      </div>
      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        disabled={loading || oauthLoading}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a73e8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1765cc] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#1a73e8]/50 disabled:opacity-60"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white">
          <GoogleIcon className="h-4 w-4" />
        </span>
        {oauthLoading ? "Google yönlendiriliyor…" : "Google ile devam et"}
      </button>
      <p className="text-sm text-zinc-600">
        Hesabınız yok mu?{" "}
        <Link
          href={`/kayit?next=${encodeURIComponent(next)}`}
          className="font-medium text-emerald-700 underline-offset-2 transition-colors hover:text-emerald-600 hover:underline"
        >
          Kayıt olun
        </Link>
      </p>
    </form>
  );
}
