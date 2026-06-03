function withProtocol(origin: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(origin)
    ? origin
    : `https://${origin}`;
}

export function buildOAuthRedirectTo(next?: string): string {
  const currentOrigin =
    typeof window !== "undefined" ? window.location.origin : "";
  const fallbackOrigin =
    currentOrigin || process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
  const base = fallbackOrigin ? withProtocol(fallbackOrigin) : "http://localhost:3000";
  const url = new URL("/auth/callback", base);

  if (next?.startsWith("/")) {
    url.searchParams.set("next", next);
  }

  return url.toString();
}
