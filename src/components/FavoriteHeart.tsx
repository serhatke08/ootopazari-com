"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function explainSupabaseError(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (e && typeof e === "object") {
    const anyErr = e as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    const parts = [
      typeof anyErr.message === "string" ? anyErr.message : "",
      typeof anyErr.details === "string" ? anyErr.details : "",
      typeof anyErr.hint === "string" ? anyErr.hint : "",
      typeof anyErr.code === "string" ? `[${anyErr.code}]` : "",
    ].filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  return "Favori güncellenemedi. RLS veya oturum kontrolü yapın.";
}

function HeartIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="currentColor"
        aria-hidden
      >
        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3c1.836 0 3.486.784 4.625 2.031.14-.172.288-.335.445-.487 1.128-1.072 2.63-1.653 4.237-1.653 2.974 0 5.438 2.322 5.438 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.75.75 0 01-.704 0l-.003-.001z" />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}

type Props = {
  listingId: string;
  initialFavorited: boolean;
  loggedIn: boolean;
  /** `overlay`: liste kartı görseli üstü. `inline`: açık arka plan (ilan detay başlığı). */
  variant?: "overlay" | "inline";
};

export function FavoriteHeart({
  listingId,
  initialFavorited,
  loggedIn,
  variant = "overlay",
}: Props) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setFavorited(initialFavorited);
  }, [initialFavorited]);

  const goLogin = useCallback(() => {
    const path =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/";
    window.location.href = `/giris?next=${encodeURIComponent(path)}`;
  }, []);

  const toggle = useCallback(async () => {
    if (!loggedIn) {
      goLogin();
      return;
    }
    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        goLogin();
        return;
      }
      if (favorited) {
        const { error } = await supabase
          .from("user_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);
        if (error) throw error;
        setFavorited(false);
      } else {
        const payload = { user_id: user.id, listing_id: listingId };
        const { error } = await supabase.from("user_favorites").upsert(payload, {
          onConflict: "user_id,listing_id",
          ignoreDuplicates: true,
        });
        if (error) {
          // Bazı şemalarda unique constraint yoksa upsert conflict hatası dönebilir; insert'e düş.
          const { error: insErr } = await supabase
            .from("user_favorites")
            .insert(payload);
          if (insErr) {
            // Duplicate key ise favoride sayılır.
            if ((insErr as { code?: string }).code !== "23505") throw insErr;
          }
        }
        setFavorited(true);
      }
      router.refresh();
    } catch (e) {
      console.error(e);
      alert(explainSupabaseError(e));
    } finally {
      setPending(false);
    }
  }, [favorited, goLogin, listingId, loggedIn, router]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
      }}
      disabled={pending}
      title={
        loggedIn
          ? favorited
            ? "Favorilerden çıkar"
            : "Favorilere ekle"
          : "Favori için giriş yapın"
      }
      className={
        variant === "inline"
          ? `inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:scale-105 disabled:opacity-50 ${
              favorited
                ? "text-[#e60000]"
                : "text-[#ff1a1a] hover:text-[#e60000]"
            }`
          : `inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:scale-105 disabled:opacity-50 [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.75))] hover:[filter:drop-shadow(0_1px_3px_rgba(0,0,0,0.85))] ${
              favorited ? "text-[#e60000]" : "text-white"
            }`
      }
    >
      <HeartIcon filled={favorited} />
    </button>
  );
}
