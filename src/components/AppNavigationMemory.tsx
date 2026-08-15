"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import {
  armOAuthBackTrap,
  clearOAuthBackTrap,
  consumeOAuthPending,
  getSafeBackHref,
  isAuthPath,
  rememberAppPath,
  shouldKeepOAuthTrap,
} from "@/lib/app-nav-memory";

export function AppNavigationMemory() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    const full = search ? `${pathname}?${search}` : pathname;
    rememberAppPath(full);
  }, [pathname, search]);

  useEffect(() => {
    if (isAuthPath(pathname)) return;
    if (consumeOAuthPending()) {
      armOAuthBackTrap(pathname);
    } else if (!shouldKeepOAuthTrap(pathname)) {
      clearOAuthBackTrap();
    }
  }, [pathname]);

  useEffect(() => {
    const onPop = () => {
      if (!shouldKeepOAuthTrap(pathname)) return;
      clearOAuthBackTrap();
      window.location.replace(getSafeBackHref("/"));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [pathname]);

  return null;
}
