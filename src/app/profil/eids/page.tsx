import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import { EidsWebPanel } from "@/components/eids/EidsWebPanel";

export const metadata: Metadata = {
  title: "EİDS / e-Devlet doğrulama",
  robots: { index: false, follow: false },
};

export default async function ProfilEidsPage() {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/giris?next=${encodeURIComponent("/profil/eids")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, phone, eids_kullanici_kodu, eids_ad, eids_soyad, eids_verified_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  const phone =
    (profile as { phone?: string | null } | null)?.phone?.toString() ?? "";
  const eidsKodu = (
    profile as { eids_kullanici_kodu?: string | null } | null
  )?.eids_kullanici_kodu;
  const eidsVerified = Boolean(eidsKodu && String(eidsKodu).trim());

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">
            <Link href="/profil/ilanlarim" className="underline">
              İlanlarım
            </Link>
            {" · "}
            <Link href="/ilan-ver" className="underline">
              İlan ver
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
            EİDS / e-Devlet
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Önce webden kimlik + telefon; plaka yetkisi sonra. Mobil aynı API’yi
            kullanır.
          </p>
        </div>
      </div>

      <Suspense fallback={<p className="text-sm text-zinc-500">Yükleniyor…</p>}>
        <EidsWebPanel
          userId={user.id}
          initialPhone={phone}
          eidsVerified={eidsVerified}
          eidsAd={
            (profile as { eids_ad?: string | null } | null)?.eids_ad ?? null
          }
          eidsSoyad={
            (profile as { eids_soyad?: string | null } | null)?.eids_soyad ??
            null
          }
          eidsVerifiedAt={
            (profile as { eids_verified_at?: string | null } | null)
              ?.eids_verified_at ?? null
          }
        />
      </Suspense>
    </div>
  );
}
