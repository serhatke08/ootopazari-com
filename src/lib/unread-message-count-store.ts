"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { countUnreadMessages } from "@/lib/messages";
import { UNREAD_MESSAGES_REFRESH_EVENT } from "@/lib/unread-messages-events";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getClientAuthUser } from "@/lib/supabase/auth-client";

type Listener = () => void;

type Subscriber = {
  hasEnv: boolean;
  loggedIn: boolean;
  notify: Listener;
};

let count = 0;
let subscribers = new Set<Subscriber>();
let channel: RealtimeChannel | null = null;
let authUnsubscribe: (() => void) | null = null;
let loadCancelled = false;
let debounceTimers: ReturnType<typeof setTimeout>[] = [];

function hasActiveSubscriber(): boolean {
  for (const sub of subscribers) {
    if (sub.hasEnv && sub.loggedIn) return true;
  }
  return false;
}

function notifyAll() {
  for (const sub of subscribers) {
    sub.notify();
  }
}

function clearDebounce() {
  for (const t of debounceTimers) clearTimeout(t);
  debounceTimers = [];
}

async function loadCount() {
  const supabase = createSupabaseBrowserClient();
  try {
    const user = await getClientAuthUser(supabase);
    if (!user) {
      if (!loadCancelled) {
        count = 0;
        notifyAll();
      }
      return;
    }
    const n = await countUnreadMessages(supabase, user.id);
    if (!loadCancelled) {
      count = n;
      notifyAll();
    }
  } catch {
    if (!loadCancelled) {
      count = 0;
      notifyAll();
    }
  }
}

function scheduleExtraLoads() {
  clearDebounce();
  for (const ms of [100, 350, 800]) {
    debounceTimers.push(
      setTimeout(() => {
        if (!loadCancelled) void loadCount();
      }, ms)
    );
  }
}

function onVisible() {
  if (document.visibilityState === "visible") void loadCount();
}

function onManualRefresh() {
  void loadCount();
  scheduleExtraLoads();
}

function startSubscription() {
  if (channel) return;

  loadCancelled = false;
  const supabase = createSupabaseBrowserClient();

  void loadCount();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => {
    void loadCount();
  });
  authUnsubscribe = () => subscription.unsubscribe();

  channel = supabase
    .channel("global-unread-messages")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages" },
      () => {
        void loadCount();
      }
    )
    .subscribe();

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener(UNREAD_MESSAGES_REFRESH_EVENT, onManualRefresh);
}

function stopSubscription() {
  loadCancelled = true;
  clearDebounce();

  if (authUnsubscribe) {
    authUnsubscribe();
    authUnsubscribe = null;
  }

  if (channel) {
    const supabase = createSupabaseBrowserClient();
    void supabase.removeChannel(channel);
    channel = null;
  }

  document.removeEventListener("visibilitychange", onVisible);
  window.removeEventListener(UNREAD_MESSAGES_REFRESH_EVENT, onManualRefresh);

  count = 0;
  notifyAll();
}

function syncSubscription() {
  if (hasActiveSubscriber()) {
    startSubscription();
  } else {
    stopSubscription();
  }
}

export function getUnreadMessageCountSnapshot(
  hasEnv: boolean,
  loggedIn: boolean
): number {
  if (!hasEnv || !loggedIn) return 0;
  return count;
}

export function subscribeUnreadMessageCount(
  hasEnv: boolean,
  loggedIn: boolean,
  onStoreChange: Listener
): () => void {
  const subscriber: Subscriber = { hasEnv, loggedIn, notify: onStoreChange };
  subscribers.add(subscriber);
  syncSubscription();
  onStoreChange();

  return () => {
    subscribers.delete(subscriber);
    syncSubscription();
  };
}

export function refreshUnreadMessageCount(): void {
  if (!hasActiveSubscriber()) return;
  void loadCount();
}
