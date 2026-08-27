import type { SupabaseClient } from "@supabase/supabase-js";

/** Web kanalı — mobil uygulama ios/android yazar. */
export const WEB_CLIENT_CHANNEL = "web" as const;

export type ClientChannel = "web" | "ios" | "android";

export const SIGNUP_CLIENT_META_KEY = "signup_client";
export const PROFILE_SIGNUP_COLUMN = "signup_client";
export const LISTING_CREATED_CLIENT_COLUMN = "created_client";

export function signupMetadataForAuth(): Record<string, string> {
  return { [SIGNUP_CLIENT_META_KEY]: WEB_CLIENT_CHANNEL };
}

export function listingCreatedClientField(): Record<string, string> {
  return { [LISTING_CREATED_CLIENT_COLUMN]: WEB_CLIENT_CHANNEL };
}

/**
 * OAuth / eski kayıtlar: profilde kanal yoksa bir kez `web` yazar (üzerine yazmaz).
 */
export async function stampSignupClientIfMissing(
  supabase: SupabaseClient
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const metaExisting = String(meta?.[SIGNUP_CLIENT_META_KEY] ?? "").trim();
  if (metaExisting) return;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select(PROFILE_SIGNUP_COLUMN)
      .eq("id", user.id)
      .maybeSingle();

    const profileExisting = String(
      (profile as Record<string, unknown> | null)?.[PROFILE_SIGNUP_COLUMN] ?? ""
    ).trim();
    if (profileExisting) return;

    await supabase.auth.updateUser({
      data: signupMetadataForAuth(),
    });
    await supabase
      .from("profiles")
      .update({ [PROFILE_SIGNUP_COLUMN]: WEB_CLIENT_CHANNEL })
      .eq("id", user.id)
      .is(PROFILE_SIGNUP_COLUMN, null);
  } catch {
    // Kanal istatistiği kritik akışı kesmemeli.
  }
}
