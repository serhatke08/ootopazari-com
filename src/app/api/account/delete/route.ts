import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { tryGetSupabaseEnv } from "@/lib/env";

const DELETE_CONFIRM_TEXT = "HESABIMI SIL";

export async function POST(request: Request) {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return NextResponse.json(
      { ok: false, message: "Sunucu yapılandırması eksik." },
      { status: 500 }
    );
  }

  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRole) {
    return NextResponse.json(
      { ok: false, message: "Sunucu güvenlik anahtarı eksik." },
      { status: 500 }
    );
  }

  let confirmText = "";
  try {
    const body = (await request.json()) as { confirmText?: string };
    confirmText = String(body?.confirmText ?? "").trim();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Geçersiz istek gövdesi." },
      { status: 400 }
    );
  }

  if (confirmText.toUpperCase() !== DELETE_CONFIRM_TEXT) {
    return NextResponse.json(
      { ok: false, message: `Onay metni hatalı: ${DELETE_CONFIRM_TEXT}` },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(env.url, env.anonKey, {
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

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json(
      { ok: false, message: "Oturum doğrulanamadı." },
      { status: 401 }
    );
  }

  const admin = createClient(env.url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id, true);
  if (delErr) {
    return NextResponse.json(
      { ok: false, message: delErr.message || "Hesap silinemedi." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
