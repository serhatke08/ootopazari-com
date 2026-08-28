"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-lg font-bold text-zinc-900">Sayfa yüklenemedi</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">
        Geçici bir sorun oluştu. Birkaç saniye sonra tekrar deneyin.
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
