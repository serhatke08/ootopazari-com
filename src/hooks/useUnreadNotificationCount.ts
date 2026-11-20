"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getClientAuthUser } from "@/lib/supabase/auth-client";
import { dedupeMessageNotifications } from "@/lib/user-notifications";

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
        const user = await getClientAuthUser(supabase);
        if (!user) {
          if (!cancelled) setCount(0);
          return;
        }

        // Okunmamış = read_at yok. Aynı mesajın çift satırı tek sayılır.
        const { data } = await supabase
          .from("user_notifications")
          .select("id,type,body,conversation_id,created_at")
          .or(`user_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .is("read_at", null)
          .limit(500);

        if (!cancelled) {
          setCount(
            dedupeMessageNotifications(
              (data ?? []) as {
                type: string | null;
                body: string | null;
                conversation_id: string | null;
                created_at: string;
              }[]
            ).length
          );
        }
      } catch {
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
