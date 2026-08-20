"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getClientAuthUser } from "@/lib/supabase/auth-client";
import { tryGetSupabaseEnv } from "@/lib/env";

type Notif = {
  id: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

export function HomeNotificationsRail() {
  const hasEnv = !!tryGetSupabaseEnv();
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Notif[]>([]);

  const load = useCallback(async () => {
    if (!hasEnv) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const user = await getClientAuthUser(supabase);
      if (!user) {
        setLoggedIn(false);
        setItems([]);
        return;
      }
      setLoggedIn(true);
      const { data } = await supabase
        .from("user_notifications")
        .select("id,title,body,read_at,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12);
      setItems((data ?? []) as Notif[]);
    } finally {
      setLoading(false);
    }
  }, [hasEnv]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markOne(id: string) {
    const res = await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    if (!res.ok) return;
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n
      )
    );
  }

  async function markAll() {
    const res = await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    if (!res.ok) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
  }

  const unread = items.some((n) => n.read_at == null);

  return (
    <section
      className="flex h-full min-h-[13rem] flex-1 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
      aria-label="Bildirimler"
    >
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-zinc-100 bg-zinc-50/90 px-2.5 py-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          Bildirimler
        </p>
        {loggedIn && unread ? (
          <button
            type="button"
            onClick={() => void markAll()}
            className="text-[10px] font-medium text-zinc-600 underline hover:text-zinc-900"
          >
            Tümünü oku
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 py-1.5 [scrollbar-width:thin]">
        {loading ? (
          <p className="px-1 py-6 text-center text-[11px] text-zinc-500">
            Yükleniyor…
          </p>
        ) : !loggedIn ? (
          <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2 px-2 text-center">
            <p className="text-[11px] leading-snug text-zinc-600">
              Bildirimleri görmek için giriş yapın.
            </p>
            <Link
              href="/giris?next=/"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-zinc-800"
            >
              Giriş yap
            </Link>
          </div>
        ) : items.length === 0 ? (
          <p className="px-1 py-8 text-center text-[11px] text-zinc-500">
            Bildirim yok.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((n) => {
              const isUnread = n.read_at == null;
              return (
                <li
                  key={n.id}
                  className={`rounded-md border px-2 py-1.5 ${
                    isUnread
                      ? "border-amber-200 bg-amber-50/80"
                      : "border-zinc-100 bg-zinc-50/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-zinc-900">
                      {n.title}
                    </p>
                    {isUnread ? (
                      <button
                        type="button"
                        onClick={() => void markOne(n.id)}
                        className="shrink-0 rounded border border-zinc-300 bg-white px-1 py-0.5 text-[9px] font-medium text-zinc-600 hover:bg-zinc-50"
                      >
                        Okundu
                      </button>
                    ) : null}
                  </div>
                  {n.body ? (
                    <p className="mt-0.5 line-clamp-3 text-[10px] leading-snug text-zinc-600">
                      {n.body}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[9px] text-zinc-400">
                    {new Date(n.created_at).toLocaleString("tr-TR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {loggedIn ? (
        <div className="shrink-0 border-t border-zinc-100 px-2 py-1.5">
          <Link
            href="/profil/bildirimler"
            className="block text-center text-[10px] font-semibold text-zinc-700 underline-offset-2 hover:text-zinc-900 hover:underline"
          >
            Tüm bildirimler
          </Link>
        </div>
      ) : null}
    </section>
  );
}
