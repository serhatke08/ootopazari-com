"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  selected?: boolean;
  onClick: () => void;
  leading?: ReactNode;
  subtitle?: string;
};

/** Uygulama FlowSelectTile ile aynı kart seçim stili */
export function FlowSelectTile({
  title,
  selected = false,
  onClick,
  leading,
  subtitle,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-2 flex w-full items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left shadow-sm transition ${
        selected
          ? "border-[#002776] bg-[#E8EEF8] shadow"
          : "border-transparent bg-white hover:bg-zinc-50"
      }`}
    >
      {leading ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
          {leading}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#002776]">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block text-xs text-zinc-500">{subtitle}</span>
        ) : null}
      </span>
      <svg
        className="h-4 w-4 shrink-0 text-zinc-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
