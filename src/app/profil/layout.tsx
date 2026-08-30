import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import { ProfilPageSkeleton } from "@/components/skeletons/PageSkeletons";
import { ProfilLayoutBody } from "@/app/profil/ProfilLayoutBody";

export const metadata: Metadata = {
  title: "Profilim",
  robots: { index: false, follow: false },
};

export default async function ProfilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/giris?next=${encodeURIComponent("/profil")}`);
  }

  return (
    <Suspense fallback={<ProfilPageSkeleton />}>
      <ProfilLayoutBody env={env} user={user}>
        {children}
      </ProfilLayoutBody>
    </Suspense>
  );
}
