import { NextResponse } from "next/server";
import { resolveRequestUser } from "@/lib/supabase/request-user";
import { callGetKullaniciKodu, normalizeGsmNo } from "@/lib/eids-ministry";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * Web: EİDS / Bakanlık bağlantı teşhisi (giriş gerekli).
 * Telefon veya canlı yetki gerektirmez — kapı durumunu gösterir.
 */
export async function GET(req: Request) {
  const { user } = await resolveRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const proxyBase = (
    process.env.EIDS_PROXY_URL?.trim() ||
    process.env.EIDS_PROXY_BASE_URL?.trim() ||
    "http://138.199.227.195"
  ).replace(/\/$/, "");
  const secret = process.env.EIDS_PROXY_SECRET?.trim() || "";

  let proxyOk = false;
  let proxyBody: unknown = null;
  try {
    const r = await fetch(`${proxyBase}/health`, {
      cache: "no-store",
      headers: secret ? { "x-eids-proxy-secret": secret } : {},
    });
    proxyBody = await r.json().catch(() => null);
    proxyOk = r.ok;
  } catch (e) {
    proxyBody = { error: e instanceof Error ? e.message : "proxy_unreachable" };
  }

  // Dummy yetki — cevap şekli önemli (03_ Message vs TB-xxxx)
  let ministryProbe: {
    httpStatus: number;
    message: string | null;
    looksLikeGatewayBlock: boolean;
  } | null = null;
  try {
    const kk = await callGetKullaniciKodu({
      yetkiKodu: "PROBE_INVALID_YETKI_XXXX",
      gsmNo: "5300000000",
    });
    const msg = kk.hataMesaji || kk.hataKodu || null;
    ministryProbe = {
      httpStatus: kk.httpStatus,
      message: msg,
      looksLikeGatewayBlock: Boolean(
        msg && /03_Kullanici bilgilerini kontrol ediniz/i.test(msg)
      ),
    };
  } catch (e) {
    ministryProbe = {
      httpStatus: 0,
      message: e instanceof Error ? e.message : "probe_failed",
      looksLikeGatewayBlock: false,
    };
  }

  const admin = createSupabaseServiceClient();
  let phone: string | null = null;
  let phoneNorm: string | null = null;
  let eidsKullaniciKodu: string | null = null;
  if (admin) {
    const { data: profile } = await admin
      .from("profiles")
      .select("phone, eids_kullanici_kodu")
      .eq("id", user.id)
      .maybeSingle();
    phone =
      (profile as { phone?: string | null } | null)?.phone?.toString() ?? null;
    phoneNorm = normalizeGsmNo(phone);
    eidsKullaniciKodu =
      (profile as { eids_kullanici_kodu?: string | null } | null)
        ?.eids_kullanici_kodu ?? null;
  }

  return NextResponse.json({
    ok: true,
    proxyOk,
    proxy: proxyBody,
    ministryProbe,
    profile: {
      phone,
      phoneNorm,
      phoneCandidates: phoneNorm
        ? [phoneNorm, `0${phoneNorm}`, `90${phoneNorm}`]
        : [],
      eidsVerified: Boolean(eidsKullaniciKodu),
      eidsKullaniciKoduPrefix: eidsKullaniciKodu
        ? `${eidsKullaniciKodu.slice(0, 8)}…`
        : null,
    },
    hint: ministryProbe?.looksLikeGatewayBlock
      ? "Bakanlık API kapısı 03_ dönüyor (health/probe). Telefon formatından bağımsız olabilir; eids@ticaret.gov.tr ile API aktivasyonu kontrol edilmeli."
      : "Probe tamam. Canlı e-Devlet sonrası GetKullaniciKodu için profil telefonu e-Devlet numarasıyla aynı olmalı.",
  });
}
