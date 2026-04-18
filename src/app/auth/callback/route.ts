import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { tryGetSupabaseEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next")?.startsWith("/") ? searchParams.get("next") : "/";

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

  return NextResponse.redirect(`${origin}${next}`);
}
