import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { tryGetSupabaseEnv } from "@/lib/env";
import { MissingEnv } from "@/components/MissingEnv";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Giriş Yap",
  description: "Hesabınıza giriş yapın.",
  robots: { index: false, follow: false },
};

export default function GirisPage() {
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
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Giriş</h1>
      <p className="mb-6 text-sm text-zinc-600">
        Kayıtlı e-posta adresiniz ve şifrenizle giriş yapın.
      </p>
      <Suspense fallback={<p className="text-sm text-zinc-500">Yükleniyor…</p>}>
        <LoginForm />
      </Suspense>
      <p className="mt-8 text-center text-xs text-zinc-500">
        <Link href="/" className="hover:underline">
          Ana sayfaya dön
        </Link>
      </p>
    </div>
  );
}
