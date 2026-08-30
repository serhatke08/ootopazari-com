"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function hasPublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Alt menü: body'ye portal — overflow:hidden (ana sayfa scroll) içinde kaybolmasın. */
export function MobileBottomNavRoot() {
  const hasEnv = hasPublicEnv();
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const unreadMessageCount = useUnreadMessageCount(hasEnv, loggedIn);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!hasEnv) return;
    const supabase = createSupabaseBrowserClient();

    void supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session?.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, [hasEnv]);

  if (!mounted || !hasEnv) return null;

  return createPortal(
    <MobileBottomNav
      loggedIn={loggedIn}
      hasEnv={hasEnv}
      unreadMessageCount={unreadMessageCount}
    />,
    document.body
  );
}
