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
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-800 transition hover:bg-zinc-100"
      }
    >
      <BackChevronIcon />
    </button>
  );
}

function BackChevronIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      className="h-[1.125rem] w-[1.125rem]"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 19.5 8.25 12l7.5-7.5"
      />
    </svg>
  );
}
