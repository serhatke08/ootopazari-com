"use client";

import { useState } from "react";

type Props = {
  phone: string;
};

const primaryBtn =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700";

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
        className={primaryBtn}
      >
        <PhoneIcon />
        Ara
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <a href={`tel:${tel}`} className={primaryBtn}>
        <PhoneIcon />
        Hemen ara
      </a>
      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="flex w-full items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
        >
          Numarayı göster
        </button>
      ) : (
        <p className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2.5 text-center text-sm font-semibold tabular-nums text-blue-900">
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
      fill="currentColor"
      className="h-[1.125rem] w-[1.125rem] shrink-0"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293 1.293c-.135.135-.202.324-.128.495 1.234 2.676 3.676 5.119 6.352 6.352.17.074.36.007.495-.128l1.293-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.819V19.5a3 3 0 0 1-3 3h-2.25C8.716 22.5 1.5 15.284 1.5 6.75V4.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
