"use client";

import { useCallback, useState, type MouseEvent } from "react";

type Props = {
  /** Gösterilen ve panoya kopyalanan metin (örn. #12345678) */
  text: string;
  className?: string;
};

export function CopyListingNumber({ text, className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  const onClick = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        /* clipboard izni yok vb. */
      }
    },
    [text]
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline cursor-pointer rounded border-0 bg-transparent p-0 font-inherit underline decoration-blue-600/0 decoration-1 underline-offset-2 transition hover:bg-blue-50 hover:decoration-blue-600/40 ${className}`}
      title={copied ? "Kopyalandı" : "Kopyalamak için tıkla"}
      aria-label={
        copied ? "İlan numarası kopyalandı" : "İlan numarasını kopyala"
      }
    >
      {text}
    </button>
  );
}
