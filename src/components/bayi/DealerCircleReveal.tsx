"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { dealerTheme, dealerTypeFromHref } from "@/lib/dealer-theme";

type Reveal = {
  x: number;
  y: number;
  start: number;
  end: number;
  color: string;
  logoSrc: string;
  label: string;
};

function coverRadius(x: number, y: number) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const corners = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ] as const;
  return Math.max(
    ...corners.map(([cx, cy]) => Math.hypot(cx - x, cy - y))
  );
}

export function useDealerCircleNav() {
  const router = useRouter();
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [expanded, setExpanded] = useState(false);

  const go = useCallback(
    (href: string, originEl: HTMLElement | null) => {
      const type = dealerTypeFromHref(href);
      if (!type) {
        router.push(href);
        return;
      }
      const theme = dealerTheme(type);
      const rect = originEl?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const y = rect ? rect.top + rect.height / 2 : 80;
      const start = rect ? Math.max(rect.width, rect.height) / 2 : 20;
      const end = coverRadius(x, y) + 24;
      setExpanded(false);
      setReveal({
        x,
        y,
        start,
        end,
        color: theme.primary,
        logoSrc: theme.logoSrc,
        label: theme.label,
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setExpanded(true));
      });
      window.setTimeout(() => {
        router.push(href);
      }, 380);
    },
    [router]
  );

  const overlay = reveal ? (
    <div
      className="pointer-events-none fixed inset-0 z-[80]"
      style={{
        clipPath: `circle(${expanded ? reveal.end : reveal.start}px at ${reveal.x}px ${reveal.y}px)`,
        backgroundColor: reveal.color,
        transition: "clip-path 380ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div className="flex h-full w-full flex-col items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={reveal.logoSrc}
          alt=""
          className="h-28 w-28 rounded-full object-cover shadow-2xl ring-4 ring-white/25"
        />
        <p className="mt-5 text-3xl font-black uppercase tracking-[0.18em] text-white">
          {reveal.label}
        </p>
      </div>
    </div>
  ) : null;

  return { go, overlay };
}
