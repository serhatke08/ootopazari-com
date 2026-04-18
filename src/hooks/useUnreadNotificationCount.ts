"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useUnreadNotificationCount(
  hasEnv: boolean,
  loggedIn: boolean
): number {
  const [count, setCount] = useState(0);

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

        const { count: c } = await supabase
          .from("user_notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("read_at", null);

        if (!cancelled) setCount(c ?? 0);
      } catch {
        // Geçici ağ/Supabase kesintilerinde sessizce son değeri koru.
        if (!cancelled) setCount(0);
      }
    }

    void load();

    const channel = supabase
      .channel("global-unread-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_notifications" },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [hasEnv, loggedIn]);

  return count;
}
