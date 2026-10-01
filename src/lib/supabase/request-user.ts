import { createClient, type User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * App (Bearer JWT) + web (cookie) ortak kullanıcı çözümleme.
 * Flutter `Authorization: Bearer <access_token>` gönderir; cookie yoktur.
 */
export async function resolveRequestUser(req: Request): Promise<{
  user: User | null;
  supabase: SupabaseClient;
}> {
  const auth = req.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  const token = match?.[1]?.trim() ?? "";

  if (token) {
    const { url, anonKey } = getSupabaseEnv();
    const supabase = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (user && !error) {
      return { user, supabase };
    }
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user, supabase };
}
