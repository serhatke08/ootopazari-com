"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  getUnreadMessageCountSnapshot,
  refreshUnreadMessageCount,
  subscribeUnreadMessageCount,
} from "@/lib/unread-message-count-store";

/**
 * Giriş yapmış kullanıcı için okunmamış gelen mesaj sayısı (site geneli rozet).
 * Tek Supabase kanalı — header ve alt menü aynı store'u paylaşır.
 */
export function useUnreadMessageCount(
  hasEnv: boolean,
  loggedIn: boolean
): number {
  const pathname = usePathname();

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      subscribeUnreadMessageCount(hasEnv, loggedIn, onStoreChange),
    [hasEnv, loggedIn]
  );

  const getSnapshot = useCallback(
    () => getUnreadMessageCountSnapshot(hasEnv, loggedIn),
    [hasEnv, loggedIn]
  );

  const count = useSyncExternalStore(subscribe, getSnapshot, () => 0);

  useEffect(() => {
    if (!hasEnv || !loggedIn) return;
    refreshUnreadMessageCount();
  }, [pathname, hasEnv, loggedIn]);

  return count;
}
