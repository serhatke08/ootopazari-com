"use client";

import { useRouter } from "next/navigation";

export function ListingBackButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Geri"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push("/");
      }}
      className={
        className ??
        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-xl font-semibold leading-none text-white backdrop-blur-sm"
      }
    >
      ‹
    </button>
  );
}
