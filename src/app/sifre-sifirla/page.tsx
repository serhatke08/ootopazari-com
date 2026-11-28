import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Yeni şifre belirle",
  robots: { index: false, follow: false },
};

export default function SifreSifirlaPage() {
  return (
    <div className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6 sm:py-14">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white px-5 py-8 shadow-sm sm:px-8">
        <Suspense
          fallback={
            <p className="text-center text-sm text-zinc-500">Yükleniyor…</p>
          }
        >
          <ResetPasswordForm />
        </Suspense>
        <p className="mt-8 text-center text-xs text-zinc-500">
          <Link href="/giris" className="hover:underline">
            Girişe dön
          </Link>
        </p>
      </div>
    </div>
  );
}
