"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { countUnreadMessages } from "@/lib/messages";
import { UNREAD_MESSAGES_REFRESH_EVENT } from "@/lib/unread-messages-events";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Giriş yapmış kullanıcı için okunmamış gelen mesaj sayısı (site geneli rozet).
 * Realtime + sayfa değişimi + sekme görünür olunca yenilenir.
 * `loggedIn` false iken sorgu/abonelik açılmaz.
 */
export function useUnreadMessageCount(
  hasEnv: boolean,
  loggedIn: boolean
): number {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const debounceTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!hasEnv || !loggedIn) {
      setCount(0);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setCount(0);
          return;
        }
        const n = await countUnreadMessages(supabase, user.id);
        if (!cancelled) setCount(n);
      } catch {
        // Geçici ağ/Supabase kesintilerinde sessizce son değeri koru.
        if (!cancelled) setCount(0);
      }
    }

    function clearDebounce() {
      for (const t of debounceTimers.current) clearTimeout(t);
      debounceTimers.current = [];
    }

    function scheduleExtraLoads() {
      clearDebounce();
      for (const ms of [100, 350, 800]) {
        debounceTimers.current.push(
          setTimeout(() => {
            if (!cancelled) void load();
          }, ms)
        );
      }
    }

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    const channel = supabase
      .channel("global-unread-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          void load();
        }
      )
      .subscribe();

    function onVisible() {
      if (document.visibilityState === "visible") void load();
    }
    document.addEventListener("visibilitychange", onVisible);

    function onManualRefresh() {
      void load();
      scheduleExtraLoads();
    }
    window.addEventListener(UNREAD_MESSAGES_REFRESH_EVENT, onManualRefresh);

    return () => {
      cancelled = true;
      clearDebounce();
      subscription.unsubscribe();
      void supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(UNREAD_MESSAGES_REFRESH_EVENT, onManualRefresh);
    };
  }, [hasEnv, loggedIn, pathname]);

  return count;
}
