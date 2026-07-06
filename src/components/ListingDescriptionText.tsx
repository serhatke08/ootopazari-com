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
        className={`whitespace-pre-wrap text-sm leading-relaxed text-black lg:text-[11px] lg:leading-[1.4] ${
          !expanded && longText ? "lg:line-clamp-[12]" : ""
        }`}
      >
        {text}
      </p>
      {longText ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-1.5 text-xs font-semibold text-black/65 underline hover:text-black lg:mt-1"
        >
          {expanded ? "Daha az göster" : "Devamını oku"}
        </button>
      ) : null}
    </div>
  );
}
