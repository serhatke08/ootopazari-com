"use client";

import { useState } from "react";

const CLAMP_LINES = 12;

export function ListingDescriptionText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const lineCount = text.split(/\n/).length;
  const longText = text.length > 320 || lineCount > CLAMP_LINES;

  return (
    <div>
      <p
        className={`whitespace-pre-wrap text-xs leading-relaxed text-black sm:text-[13px] ${
          !expanded && longText ? "line-clamp-[12]" : ""
        }`}
      >
        {text}
      </p>
      {longText ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-2 text-xs font-semibold text-black/70 underline hover:text-black"
        >
          {expanded ? "Daha az göster" : "Daha fazla göster"}
        </button>
      ) : null}
    </div>
  );
}
