import { Suspense } from "react";
import Link from "next/link";
import { tryGetSupabaseEnv } from "@/lib/env";
import { MissingEnv } from "@/components/MissingEnv";
import { SignupForm } from "@/components/SignupForm";

export default function KayitPage() {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Kayıt</h1>
      <p className="mb-6 text-sm text-zinc-600">
        Bilgilerinizi doldurun. Üyelikten sonra e-postanıza bir doğrulama
        bağlantısı gelebilir; gelen kutunuzu kontrol edin.
      </p>
      <Suspense fallback={<p className="text-sm text-zinc-500">Yükleniyor…</p>}>
        <SignupForm />
      </Suspense>
      <p className="mt-8 text-center text-xs text-zinc-500">
        <Link href="/" className="hover:underline">
          Ana sayfaya dön
        </Link>
      </p>
    </div>
  );
}
