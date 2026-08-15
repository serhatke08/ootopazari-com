"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  initialFirstName: string;
  initialLastName: string;
  initialUsername: string;
  initialPhone: string;
  nextPath: string;
};

const TURKEY_COUNTRY_ID = "00000000-0000-0000-0000-000000000001";
const TURKISH_LANGUAGE_ID = "00000000-0000-0000-0000-000000000101";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 shadow-sm transition-colors hover:border-zinc-400 focus:border-[#ffcc00] focus:outline-none focus:ring-2 focus:ring-amber-300/80";

function validateUsername(username: string): string | null {
  if (!username) return "Kullanıcı adı gerekli.";
  if (username.length < 3) return "Kullanıcı adı en az 3 karakter olmalı.";
  if (/\s/.test(username)) return "Kullanıcı adında boşluk olamaz.";
  if (!/^[a-z0-9_]+$/.test(username)) {
    return "Kullanıcı adı sadece küçük harf, rakam ve alt çizgi içerebilir.";
  }
  return null;
}

export function CompleteProfileAfterOAuthForm({
  initialFirstName,
  initialLastName,
  initialUsername,
  initialPhone,
  nextPath,
}: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [username, setUsername] = useState(initialUsername);
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const f = firstName.trim();
    const l = lastName.trim();
    const u = username.trim().toLowerCase();
    const p = phone.trim();

    if (!f) return setError("Ad gerekli.");
    if (!l) return setError("Soyad gerekli.");
    const usernameError = validateUsername(u);
    if (usernameError) return setError(usernameError);
    if (!p) return setError("Telefon gerekli.");

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        setError("Oturum bulunamadı. Tekrar giriş yapın.");
        return;
      }
      const email = user.email?.trim().toLowerCase();
      if (!email) {
        setError("E-posta bulunamadı. Tekrar giriş yapın.");
        return;
      }

      const { data: usernameTaken, error: usernameErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", u)
        .neq("id", user.id)
        .maybeSingle();
      if (usernameErr) {
        setError(usernameErr.message || "Kullanıcı adı kontrol edilemedi.");
        return;
      }
      if (usernameTaken) {
        setError("Bu kullanıcı adı kullanılıyor.");
        return;
      }

      const { data: phoneTaken, error: phoneErr } = await supabase.rpc(
        "profile_phone_exists",
        {
          p_phone: p,
          p_exclude_user_id: user.id,
        }
      );
      if (!phoneErr && phoneTaken === true) {
        setError("Bu telefon numarası kullanılıyor.");
        return;
      }

      const fullName = `${f} ${l}`.trim();
      const payload = {
        email,
        full_name: fullName,
        username: u,
        phone: p,
        country_id: TURKEY_COUNTRY_ID,
        language_id: TURKISH_LANGUAGE_ID,
      };

      const { error: upErr } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...payload }, { onConflict: "id" });
      if (upErr) {
        setError(upErr.message || "Profil kaydedilemedi.");
        return;
      }

      const { error: metaErr } = await supabase.auth.updateUser({
        data: {
          first_name: f,
          last_name: l,
          full_name: fullName,
          username: u,
          phone: p,
        },
      });
      if (metaErr) {
        setError(metaErr.message || "Kullanıcı bilgileri güncellenemedi.");
        return;
      }

      router.refresh();
      router.push(nextPath);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 flex max-w-md flex-col gap-3">
      <label className="text-sm font-medium text-zinc-800">
        Ad
        <input
          type="text"
          required
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="text-sm font-medium text-zinc-800">
        Soyad
        <input
          type="text"
          required
          autoComplete="family-name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="text-sm font-medium text-zinc-800">
        Kullanıcı adı
        <input
          type="text"
          required
          autoComplete="username"
          placeholder="ornek_kullanici"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          className={inputClass}
        />
      </label>
      <label className="text-sm font-medium text-zinc-800">
        Telefon
        <input
          type="tel"
          required
          autoComplete="tel"
          placeholder="Örn. 05xx xxx xx xx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 rounded-lg bg-[#ffcc00] px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-amber-300 disabled:opacity-60"
      >
        {loading ? "Kaydediliyor…" : "Devam et"}
      </button>
    </form>
  );
}
