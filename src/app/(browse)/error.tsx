"use client";

import { useEffect } from "react";

export default function HomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="text-lg font-bold text-zinc-900">Ana sayfa yüklenemedi</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">
        İlanlar geçici olarak getirilemedi. Lütfen tekrar deneyin.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-xl bg-[#7c3aed] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6d28d9]"
      >
        Tekrar dene
      </button>
    </div>
  );
}
