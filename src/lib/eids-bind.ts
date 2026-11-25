import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BindEidsResult =
  | { ok: true; alreadyBound: boolean }
  | { ok: false; error: "eids_already_linked" | "bind_failed"; message: string };

const EIDS_CLEAR = {
  eids_kullanici_kodu: null,
  eids_ad: null,
  eids_soyad: null,
  eids_verified_at: null,
} as const;

/**
 * Bir e-Devlet kullanıcı kodu yalnızca bir uygulama hesabına bağlanır.
 * Aynı hesap tekrar doğrularsa idempotent OK.
 */
export async function bindEidsKullaniciToProfile(
  admin: SupabaseClient,
  params: {
    userId: string;
    kullaniciKodu: string;
    ad?: string | null;
    soyad?: string | null;
  }
): Promise<BindEidsResult> {
  const kod = params.kullaniciKodu.trim();
  if (!kod) {
    return { ok: false, error: "bind_failed", message: "kullanici_kodu_empty" };
  }

  const { data: existing } = await admin
    .from("profiles")
    .select("id, eids_kullanici_kodu")
    .eq("eids_kullanici_kodu", kod)
    .maybeSingle();

  const ownerId = (existing as { id?: string } | null)?.id ?? null;
  if (ownerId && ownerId !== params.userId) {
    return {
      ok: false,
      error: "eids_already_linked",
      message:
        "Bu e-Devlet hesabı başka bir Oto Pazarı hesabına tanımlı. O hesaba giriş yapın veya farklı bir e-Devlet kullanın.",
    };
  }

  const { data: self } = await admin
    .from("profiles")
    .select("id, eids_kullanici_kodu")
    .eq("id", params.userId)
    .maybeSingle();

  const selfKod = (
    self as { eids_kullanici_kodu?: string | null } | null
  )?.eids_kullanici_kodu;
  if (selfKod && String(selfKod).trim() === kod) {
    return { ok: true, alreadyBound: true };
  }

  const { error } = await admin
    .from("profiles")
    .update({
      eids_kullanici_kodu: kod,
      eids_ad: params.ad ?? null,
      eids_soyad: params.soyad ?? null,
      eids_verified_at: new Date().toISOString(),
    })
    .eq("id", params.userId);

  if (error) {
    const code = error.code ?? "";
    const msg = (error.message ?? "").toLowerCase();
    if (
      code === "23505" ||
      msg.includes("eids_kullanici_kodu") ||
      msg.includes("duplicate") ||
      msg.includes("unique")
    ) {
      return {
        ok: false,
        error: "eids_already_linked",
        message:
          "Bu e-Devlet hesabı başka bir Oto Pazarı hesabına tanımlı. O hesaba giriş yapın veya farklı bir e-Devlet kullanın.",
      };
    }
    return {
      ok: false,
      error: "bind_failed",
      message: error.message || "bind_failed",
    };
  }

  return { ok: true, alreadyBound: false };
}

/**
 * e-Devlet oturumu bu kullanıcıda kanıtlandı ama kod başka profildedir.
 * Eski profilden koparıp bu hesaba taşır.
 */
export async function transferEidsKullaniciToProfile(
  admin: SupabaseClient,
  params: {
    userId: string;
    kullaniciKodu: string;
    ad?: string | null;
    soyad?: string | null;
  }
): Promise<BindEidsResult> {
  const kod = params.kullaniciKodu.trim();
  if (!kod) {
    return { ok: false, error: "bind_failed", message: "kullanici_kodu_empty" };
  }

  const { error: clearErr } = await admin
    .from("profiles")
    .update({ ...EIDS_CLEAR })
    .eq("eids_kullanici_kodu", kod)
    .neq("id", params.userId);

  if (clearErr) {
    return {
      ok: false,
      error: "bind_failed",
      message: clearErr.message || "unbind_failed",
    };
  }

  return bindEidsKullaniciToProfile(admin, params);
}

/** Bu hesabın e-Devlet bağını koparır (taşıma yok). */
export async function unbindEidsFromCurrentProfile(
  admin: SupabaseClient,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await admin
    .from("profiles")
    .update({ ...EIDS_CLEAR })
    .eq("id", userId);
  if (error) {
    return { ok: false, error: error.message || "unbind_failed" };
  }
  return { ok: true };
}
