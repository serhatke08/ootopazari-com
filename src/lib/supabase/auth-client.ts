import type { SupabaseClient, User } from "@supabase/supabase-js";

/** İstemcide oturum — ağ kesintisinde null döner, konsolu kirletmez. */
export async function getClientAuthUser(
  supabase: SupabaseClient
): Promise<User | null> {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session?.user) return null;
    return session.user;
  } catch {
    return null;
  }
}
