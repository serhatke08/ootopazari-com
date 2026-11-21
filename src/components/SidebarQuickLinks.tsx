"use client";

import Link from "next/link";
import { QUICK_ACCESS_LINKS } from "@/lib/quick-access-links";
import { HomeShortcutGlyphIcon } from "@/components/home/HomeShortcutGlyph";
import type { HomeShortcutGlyph } from "@/lib/home-shortcuts";

type QuickLinkItem = {
  href: string;
  label: string;
  image?: string;
  glyph?: HomeShortcutGlyph;
  fillColor?: string;
};

export function SidebarQuickLinks({
  onNavigate,
  compact = false,
  items,
}: {
  onNavigate?: () => void;
  compact?: boolean;
  /** Verilirse bu liste render edilir; yoksa QUICK_ACCESS_LINKS kullanılır. */
  items?: QuickLinkItem[];
} = {}) {
  const linkClass = compact
    ? "flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[11px] font-medium leading-snug text-zinc-900 shadow-sm transition hover:border-[#ffcc00] hover:bg-amber-50/50"
    : "flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium leading-snug text-zinc-900 shadow-sm transition hover:border-[#ffcc00] hover:bg-amber-50/50";

  const iconBox = compact ? "h-7 w-7 rounded-lg" : "h-9 w-9 rounded-xl";
  const iconSize = compact ? 28 : 36;

  const list = items ?? QUICK_ACCESS_LINKS;

  return (
    <nav
      aria-label="Kısayol bağlantıları"
      className={compact ? "flex w-full flex-col gap-1" : "flex w-full flex-col gap-2"}
    >
      {list.map((item) => (
        <Link
          key={item.href + item.label}
          href={item.href}
          prefetch={false}
          onClick={() => onNavigate?.()}
          className={linkClass}
        >
          {item.glyph ? (
            <span
              className={`flex shrink-0 items-center justify-center text-white ${iconBox}`}
              style={{ backgroundColor: item.fillColor ?? "#111" }}
            >
              <HomeShortcutGlyphIcon name={item.glyph} className={compact ? "h-4 w-4" : "h-5 w-5"} />
            </span>
          ) : item.image ? (
            <span
              className={`relative shrink-0 overflow-hidden bg-[#ffcc00] ${iconBox}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt=""
                width={iconSize}
                height={iconSize}
                className={compact ? "h-7 w-7 object-cover" : "h-9 w-9 object-cover"}
              />
            </span>
          ) : (
            <span
              className={`flex shrink-0 items-center justify-center bg-[#ffcc00] text-[10px] font-bold text-zinc-900 ${iconBox}`}
            >
              ?
            </span>
          )}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
