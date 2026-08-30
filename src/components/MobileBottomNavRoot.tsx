"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function hasPublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

class BottomNavErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function MobileBottomNavAuthed() {
  const hasEnv = hasPublicEnv();
  const [loggedIn, setLoggedIn] = useState(false);
  const unreadMessageCount = useUnreadMessageCount(hasEnv, loggedIn);

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

  return (
    <MobileBottomNav
      loggedIn={loggedIn}
      hasEnv={hasEnv}
      unreadMessageCount={unreadMessageCount}
    />
  );
}

/** Alt menü layout akışında — overflow:hidden / portal yüzünden kaybolmasın. */
export function MobileBottomNavRoot() {
  return (
    <BottomNavErrorBoundary
      fallback={
        <MobileBottomNav loggedIn={false} hasEnv={false} unreadMessageCount={0} />
      }
    >
      <MobileBottomNavAuthed />
    </BottomNavErrorBoundary>
  );
}
