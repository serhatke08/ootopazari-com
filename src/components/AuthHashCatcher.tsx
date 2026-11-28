"use client";

import { useEffect } from "react";

/** Şifre sıfırlama hash’i ana sayfaya düşerse forma taşı. */
export function AuthHashCatcher() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;
    if (!hash.includes("type=recovery") && !hash.includes("type=magiclink")) {
      return;
    }
    if (window.location.pathname.startsWith("/sifre-sifirla")) return;
    window.location.replace(`/sifre-sifirla${window.location.search}${hash}`);
  }, []);
  return null;
}
