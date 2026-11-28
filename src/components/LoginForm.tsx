"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { friendlyAuthError } from "@/lib/auth-errors";
import { AuthEntryHeader } from "@/components/AuthEntryHeader";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildOAuthRedirectTo, safeNextPath } from "@/lib/oauth-redirect";
import { markOAuthRedirect } from "@/lib/app-nav-memory";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get("next");
  const oauthErrorRaw = searchParams.get("error");
  const next = safeNextPath(nextRaw);
  const oauthError =
    oauthErrorRaw && oauthErrorRaw.trim()
      ? friendlyAuthError(decodeURIComponent(oauthErrorRaw))
      : null;
  const resetOk = searchParams.get("reset") === "ok";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [usePhone, setUsePhone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  async function signInWithGoogle() {
    if (oauthLoading || loading) return;
    setError(null);
    setOauthLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = buildOAuthRedirectTo(next);
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
        markOAuthRedirect();
        window.location.replace(data.url);
        return;
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
      const raw = identifier.trim();
      let emails: string[] = [];
      if (usePhone) {
        const { data } = await supabase.rpc("resolve_login_emails", {
          p_identifier: raw,
        });
        if (Array.isArray(data)) {
          emails = data
            .map((e) => String(e ?? "").trim().toLowerCase())
            .filter((e) => e.includes("@"));
        } else if (typeof data === "string" && data.includes("@")) {
          emails = [data.trim().toLowerCase()];
        }
      } else {
        emails = [raw];
      }
      emails = [...new Set(emails)];
      if (emails.length === 0) {
        setError(friendlyAuthError("Invalid login credentials"));
        return;
      }
      let lastErr: { message: string } | null = null;
      let ok = false;
      for (const email of emails) {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!err) {
          ok = true;
          lastErr = null;
          break;
        }
        lastErr = err;
      }
      if (!ok) {
        setError(friendlyAuthError(lastErr?.message ?? "Invalid login credentials"));
        return;
      }
      router.refresh();
      router.replace(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col">
      <AuthEntryHeader
        subtitle="Giriş yap"
        onGoogle={() => void signInWithGoogle()}
        googleBusy={oauthLoading}
        googleDisabled={loading}
      />
      {resetOk ? (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Şifren güncellendi. Yeni şifrenle giriş yap.
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-4" autoComplete="on">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => {
              setUsePhone(false);
              setIdentifier("");
            }}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              !usePhone
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600"
            }`}
          >
            E-posta
          </button>
          <button
            type="button"
            onClick={() => {
              setUsePhone(true);
              setIdentifier("");
            }}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              usePhone
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600"
            }`}
          >
            Telefon
          </button>
        </div>
        <label className="flex flex-col gap-1 text-sm text-zinc-800">
          {usePhone ? "Telefon" : "E-posta"}
          <input
            key={usePhone ? "login-phone" : "login-email"}
            type={usePhone ? "tel" : "email"}
            autoComplete={usePhone ? "tel" : "email"}
            inputMode={usePhone ? "tel" : "email"}
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={
              usePhone ? "05xx xxx xx xx" : "name@example.com"
            }
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
        <p className="text-center text-sm text-zinc-600">
          Hesabınız yok mu?{" "}
          <Link
            href={`/kayit?next=${encodeURIComponent(next)}`}
            className="font-medium text-emerald-700 underline-offset-2 transition-colors hover:text-emerald-600 hover:underline"
          >
            Kayıt olun
          </Link>
        </p>
      </form>
    </div>
  );
}
