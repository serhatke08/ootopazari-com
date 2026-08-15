"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isListingDetailPath } from "@/lib/listing-seo";

export function SiteHeaderFallback() {
  const pathname = usePathname();
  if (isListingDetailPath(pathname)) return null;
  return <header className="h-14 border-b border-amber-400/80 bg-[#ffcc00]" />;
}

export function SiteMainShell({ children }: { children: ReactNode }) {
  return <div className="layout-with-mobile-nav flex flex-1 flex-col">{children}</div>;
}
