"use client";

import { useState } from "react";

type Props = {
  phone: string;
};

export function ListingContactPhone({ phone }: Props) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const tel = phone.replace(/[^\d+]/g, "");

  if (!phone.trim()) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-black/15 bg-[#ffcc00] px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-amber-300"
      >
        <PhoneIcon />
        Ara
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <a
        href={`tel:${tel}`}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/15 bg-[#ffcc00] px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-amber-300"
      >
        <PhoneIcon />
        Hemen ara
      </a>
      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="flex w-full items-center justify-center rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-black/[0.03]"
        >
          Numarayı göster
        </button>
      ) : (
        <p className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2.5 text-center text-sm font-semibold tabular-nums text-black">
          {phone}
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setRevealed(false);
        }}
        className="w-full text-center text-xs font-medium text-black/50 hover:text-black/75"
      >
        Kapat
      </button>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.72 1.062a12.042 12.042 0 01-5.303-5.303l1.062-.72c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 6.75z"
      />
    </svg>
  );
}
