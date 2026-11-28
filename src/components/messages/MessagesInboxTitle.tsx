"use client";

import { useState } from "react";

export function MessagesInboxTitle() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-full items-center gap-1 rounded-lg px-0.5 py-0.5 text-left"
        aria-expanded={open}
      >
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Mesajlar
        </h1>
        <svg
          viewBox="0 0 24 24"
          className={`h-6 w-6 shrink-0 text-zinc-800 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="mt-2 max-w-xl rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] font-medium leading-snug text-zinc-800">
          Sola çekince sohbet listeden silinir. Sohbette mesaja basılı tutunca
          sil veya düzenle çıkar.
        </div>
      ) : null}
    </div>
  );
}
