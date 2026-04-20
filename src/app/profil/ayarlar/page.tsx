import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import { AccountSettingsPanel } from "@/components/AccountSettingsPanel";

export const metadata: Metadata = {
  title: "Ayarlar",
  robots: { index: false, follow: false },
};

export default async function ProfilAyarlarPage() {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect(`/giris?next=${encodeURIComponent("/profil/ayarlar")}`);
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
        Hesap ayarları
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        Güvenlik ve hesap yönetimi seçeneklerini buradan yönetebilirsin.
      </p>
      <AccountSettingsPanel email={user.email} />
    </div>
  );
}
