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
    <div className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6 sm:py-14">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white px-5 py-8 shadow-sm sm:px-8">
        <Suspense fallback={<p className="text-center text-sm text-zinc-500">Yükleniyor…</p>}>
          <LoginForm />
        </Suspense>
        <p className="mt-8 text-center text-xs text-zinc-500">
          <Link href="/" className="hover:underline">
            Ana sayfaya dön
          </Link>
        </p>
      </div>
    </div>
  );
}
