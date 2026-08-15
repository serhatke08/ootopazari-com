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
        "inline-flex h-8 w-8 items-center justify-center text-[1.65rem] font-semibold leading-none text-black"
      }
    >
      {"<"}
    </button>
  );
}
