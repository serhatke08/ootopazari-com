"use client";

import { useEffect } from "react";
import { ADSENSE_CLIENT_ID } from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type Props = {
  slot: string;
  className?: string;
  label?: string;
};

export function AdSenseUnit({ slot, className, label = "Reklam" }: Props) {
  useEffect(() => {
    if (!slot || typeof window === "undefined") return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // Ad blockers and review crawlers may block AdSense; UI should stay stable.
    }
  }, [slot]);

  if (!slot) return null;

  return (
    <section
      className={`w-full overflow-hidden rounded-lg border border-zinc-200 bg-white/70 ${className ?? ""}`}
      aria-label={label}
    >
      <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <ins
        className="adsbygoogle block min-h-[90px] w-full"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </section>
  );
}
