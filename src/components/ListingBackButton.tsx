"use client";

import { useRouter } from "next/navigation";
import {
  getSafeBackHref,
  isAuthPath,
  isSameListingPath,
  isUnsafeHistoryReferrer,
  oauthTrapArmed,
} from "@/lib/app-nav-memory";

export function ListingBackButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Geri"
      onClick={() => {
        const here = `${window.location.pathname}${window.location.search}`;

        // OAuth tuzağı / dış referrer → güvenli hedefe hard replace
        if (
          oauthTrapArmed() ||
          isUnsafeHistoryReferrer(
            typeof document !== "undefined" ? document.referrer : ""
          )
        ) {
          window.location.replace(getSafeBackHref("/"));
          return;
        }

        // document.referrer aynı origin ve farklı sayfa ise tarayıcı geri
        const ref = typeof document !== "undefined" ? document.referrer : "";
        if (ref) {
          try {
            const u = new URL(ref);
            if (
              u.origin === window.location.origin &&
              !isAuthPath(u.pathname) &&
              !isSameListingPath(u.pathname, here)
            ) {
              router.back();
              return;
            }
          } catch {
            /* ignore */
          }
        }

        const target = getSafeBackHref("/");
        // Aynı ilanın başka slug’ına gitme (SEO loop)
        if (
          !target ||
          target === here ||
          isSameListingPath(target, here)
        ) {
          router.push("/");
          return;
        }
        router.push(target);
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
