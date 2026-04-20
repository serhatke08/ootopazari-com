import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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
  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
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
      return NextResponse.redirect(
        `${origin}/hesap-tamamla?next=${encodeURIComponent(next)}`
      );
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
