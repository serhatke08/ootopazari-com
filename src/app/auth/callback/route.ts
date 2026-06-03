import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { tryGetSupabaseEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next");
  const next = nextRaw && nextRaw.startsWith("/") ? nextRaw : "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/giris?error=oauth`);
  }

  const env = tryGetSupabaseEnv();
  if (!env) {
    return NextResponse.redirect(`${origin}/giris?error=config`);
  }
  const { url, anonKey } = env;
  const pendingCookies: {
    name: string;
    value: string;
    options: CookieOptions;
  }[] = [];
  const pendingHeaders = new Headers();
  const requestCookies = new Map(
    request.cookies.getAll().map((cookie) => [cookie.name, cookie.value])
  );
  const redirectWithAuthCookies = (location: string) => {
    const response = NextResponse.redirect(location);
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    pendingHeaders.forEach((value, key) => {
      response.headers.set(key, value);
    });
    return response;
  };

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return Array.from(requestCookies.entries()).map(([name, value]) => ({
          name,
          value,
        }));
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          requestCookies.set(name, value);
          pendingCookies.push({ name, value, options });
        });
        Object.entries(headers).forEach(([key, value]) => {
          pendingHeaders.set(key, value);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectWithAuthCookies(
      `${origin}/giris?error=${encodeURIComponent(error.message)}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const m = user.user_metadata as Record<string, unknown> | undefined;
    const metaFirst =
      m && typeof m.first_name === "string" ? m.first_name.trim() || null : null;
    const metaLast =
      m && typeof m.last_name === "string" ? m.last_name.trim() || null : null;
    const metaFull =
      m && typeof m.full_name === "string" ? m.full_name.trim() || null : null;
    const metaPhone =
      m && typeof m.phone === "string" ? m.phone.trim() || null : null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,phone")
      .eq("id", user.id)
      .maybeSingle();

    const profileFull =
      profile && typeof profile.full_name === "string"
        ? profile.full_name.trim() || null
        : null;
    const profilePhone =
      profile && typeof profile.phone === "string"
        ? profile.phone.trim() || null
        : null;

    const hasName = Boolean(
      (metaFirst && metaLast) || (profileFull || metaFull)
    );
    const hasPhone = Boolean(profilePhone || metaPhone);

    if (!hasName || !hasPhone) {
      return redirectWithAuthCookies(
        `${origin}/hesap-tamamla?next=${encodeURIComponent(next)}`
      );
    }
  }

  return redirectWithAuthCookies(`${origin}${next}`);
}
