import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * `profiles.avatar_url` günceller. Upsert yerine update/insert — PostgREST upsert 400 veren şemalarla uyumlu.
 */
export async function setProfileAvatarUrl(
  supabase: SupabaseClient,
  userId: string,
  publicUrl: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: existing, error: selErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (selErr) {
    return {
      ok: false,
      message: [selErr.message, selErr.details, selErr.hint].filter(Boolean).join(" — ") || "Profil okunamadı.",
    };
  }

  if (existing) {
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);
    if (error) {
      return {
        ok: false,
        message: [error.message, error.details, error.hint].filter(Boolean).join(" — ") || "Güncellenemedi.",
      };
    }
    return { ok: true };
  }

  const { error: insErr } = await supabase.from("profiles").insert({
    id: userId,
    avatar_url: publicUrl,
  });

  if (insErr) {
    return {
      ok: false,
      message: [insErr.message, insErr.details, insErr.hint].filter(Boolean).join(" — ") || "Kayıt oluşturulamadı.",
    };
  }
  return { ok: true };
}
