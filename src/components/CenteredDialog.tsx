"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/hooks/use-is-client";

type Props = {
  title: string;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export function CenteredDialog({
  title,
  titleId,
  onClose,
  children,
  className,
}: Props) {
  const mounted = useIsClient();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-xl ${className ?? ""}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            aria-label="Geri"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl font-semibold leading-none text-zinc-800 transition hover:bg-zinc-100"
          >
            ‹
          </button>
          <h2
            id={titleId}
            className="min-w-0 flex-1 truncate text-center text-base font-semibold text-zinc-900"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl leading-none text-zinc-800 transition hover:bg-zinc-100"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
