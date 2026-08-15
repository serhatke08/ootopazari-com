"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isListingDetailPath } from "@/lib/listing-seo";

export function SiteHeaderHost({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isListingDetailPath(pathname)) return null;
  return <>{children}</>;
}

export function SiteMainShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const listing = isListingDetailPath(pathname);
  return (
    <div
      className={`flex flex-1 flex-col ${listing ? "" : "layout-with-mobile-nav"}`}
    >
      {children}
    </div>
  );
}
