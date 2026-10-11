"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  selected?: boolean;
  onClick: () => void;
  leading?: ReactNode;
  subtitle?: string;
  compact?: boolean;
  loading?: boolean;
  disabled?: boolean;
};

/** Uygulama FlowSelectTile ile aynı kart seçim stili */
export function FlowSelectTile({
  title,
  selected = false,
  onClick,
  leading,
  subtitle,
  compact = false,
  loading = false,
  disabled = false,
}: Props) {
  const locked = loading || disabled;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      data-flow-selected={selected ? "true" : undefined}
      className={`mb-1.5 flex w-full items-center text-left shadow-sm transition ${
        compact
          ? "gap-2 rounded-lg px-2.5 py-1.5"
          : "gap-3 rounded-[10px] px-3 py-2.5"
      } border ${
        selected || loading
          ? "border-[#002776] bg-[#E8EEF8] shadow"
          : "border-transparent bg-white hover:bg-zinc-50"
      } disabled:cursor-wait disabled:opacity-90`}
    >
      {leading ? (
        <span
          className={`flex shrink-0 items-center justify-center overflow-hidden ${
            compact ? "h-7 w-7" : "h-9 w-9"
          }`}
        >
          {leading}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span
          className={`block font-semibold text-[#002776] ${
            compact ? "text-[13px] leading-snug" : "text-sm"
          }`}
        >
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block text-[11px] text-zinc-500">
            {subtitle}
          </span>
        ) : null}
      </span>
      {loading ? (
        <span
          className={`inline-block shrink-0 animate-spin rounded-full border-2 border-[#002776] border-t-transparent ${
            compact ? "h-3.5 w-3.5" : "h-4 w-4"
          }`}
          aria-label="Yükleniyor"
        />
      ) : (
        <svg
          className={`shrink-0 text-zinc-400 ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
