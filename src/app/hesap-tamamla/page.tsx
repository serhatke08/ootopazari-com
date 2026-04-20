import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import { CompleteProfileAfterOAuthForm } from "@/components/CompleteProfileAfterOAuthForm";

export const metadata: Metadata = {
  title: "Hesabı Tamamla",
  robots: { index: false, follow: false },
};

function isComplete(
  firstName: string | null,
  lastName: string | null,
  fullName: string | null,
  phone: string | null
): boolean {
  const hasName = Boolean(
    (firstName && lastName) || (fullName && fullName.trim().length > 1)
  );
  const hasPhone = Boolean(phone && phone.trim().length > 0);
  return hasName && hasPhone;
}

export default async function HesapTamamlaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const sp = await searchParams;
  const rawNext = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  const nextPath =
    typeof rawNext === "string" && rawNext.startsWith("/") && rawNext !== "/hesap-tamamla"
      ? rawNext
      : "/";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/giris?next=${encodeURIComponent(`/hesap-tamamla?next=${nextPath}`)}`);
  }

  const m = user.user_metadata as Record<string, unknown> | undefined;
  const metaFirst =
    m && typeof m.first_name === "string" ? m.first_name.trim() || null : null;
  const metaLast =
    m && typeof m.last_name === "string" ? m.last_name.trim() || null : null;
  const metaFull =
    m && typeof m.full_name === "string" ? m.full_name.trim() || null : null;
  const metaPhone =
    m && typeof m.phone === "string" ? m.phone.trim() || null : null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,phone")
    .eq("id", user.id)
    .maybeSingle();

  const profileFull =
    profile && typeof profile.full_name === "string"
      ? profile.full_name.trim() || null
      : null;
  const profilePhone =
    profile && typeof profile.phone === "string"
      ? profile.phone.trim() || null
      : null;

  const firstName = metaFirst;
  const lastName = metaLast;
  const fullName = profileFull || metaFull;
  const phone = profilePhone || metaPhone;

  if (isComplete(firstName, lastName, fullName, phone)) {
    redirect(nextPath);
  }

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Hesabını tamamla
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Google ile giriş başarılı. Devam etmek için ad, soyad ve telefon bilgini tamamla.
      </p>
      <CompleteProfileAfterOAuthForm
        initialFirstName={firstName ?? ""}
        initialLastName={lastName ?? ""}
        initialPhone={phone ?? ""}
        nextPath={nextPath}
      />
    </div>
  );
}
