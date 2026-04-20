"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  initialFirstName: string;
  initialLastName: string;
  initialPhone: string;
  nextPath: string;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 shadow-sm transition-colors hover:border-zinc-400 focus:border-[#ffcc00] focus:outline-none focus:ring-2 focus:ring-amber-300/80";

export function CompleteProfileAfterOAuthForm({
  initialFirstName,
  initialLastName,
  initialPhone,
  nextPath,
}: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const f = firstName.trim();
    const l = lastName.trim();
    const p = phone.trim();

    if (!f) return setError("Ad gerekli.");
    if (!l) return setError("Soyad gerekli.");
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

      const fullName = `${f} ${l}`.trim();
      const payload = {
        full_name: fullName,
        phone: p,
      };

      const { error: upErr } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", user.id);

      if (upErr) {
        const { error: insErr } = await supabase
          .from("profiles")
          .insert({ id: user.id, ...payload });
        if (insErr) {
          setError(insErr.message || "Profil kaydedilemedi.");
          return;
        }
      }

      const { error: metaErr } = await supabase.auth.updateUser({
        data: {
          first_name: f,
          last_name: l,
          full_name: fullName,
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
