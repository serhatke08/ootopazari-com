"use client";

import { usePathname } from "next/navigation";
import { dealerTheme, dealerTypeFromHref } from "@/lib/dealer-theme";
import { DealerTypeLogo } from "@/components/DealerTypeLogo";

export function BayiEntranceHold() {
  const pathname = usePathname() || "";
  const type = dealerTypeFromHref(pathname);
  if (!type) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-zinc-50" />
    );
  }
  const theme = dealerTheme(type);
  return (
    <div
      className="flex min-h-[calc(100dvh-5rem)] w-full flex-col items-center justify-center px-6"
      style={{ backgroundColor: theme.primary }}
    >
      {theme.logoSrc ? (
        <DealerTypeLogo src={theme.logoSrc} size={112} className="shadow-2xl" />
      ) : (
        <span className="h-28 w-28 rounded-full border-[2.5px] border-black bg-white/15" />
      )}
      <p className="mt-5 text-center text-3xl font-black uppercase tracking-[0.18em] text-white">
        {theme.label}
      </p>
    </div>
  );
}
