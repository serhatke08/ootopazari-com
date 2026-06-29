"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getClientAuthUser } from "@/lib/supabase/auth-client";

/** Giriş yapmış kullanıcının en az bir ilanı var mı (öne çıkarma menüsü için). */
export function useUserHasListings(
  hasEnv: boolean,
  loggedIn: boolean
): boolean {
  const pathname = usePathname();
  const [hasListings, setHasListings] = useState(false);

  useEffect(() => {
    if (!hasEnv || !loggedIn) {
      setHasListings(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    async function load() {
      try {
        const user = await getClientAuthUser(supabase);
        if (!user) {
          if (!cancelled) setHasListings(false);
          return;
        }
        const { count, error } = await supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        if (!cancelled) {
          setHasListings(!error && (count ?? 0) > 0);
        }
      } catch {
        if (!cancelled) setHasListings(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [hasEnv, loggedIn, pathname]);

  return hasListings;
}
