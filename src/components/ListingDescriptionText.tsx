"use client";

import { useState } from "react";

const CLAMP_LINES = 16;

export function ListingDescriptionText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const lineCount = text.split(/\n/).length;
  const longText = text.length > 400 || lineCount > CLAMP_LINES;

  return (
    <div>
      <p
        className={`whitespace-pre-wrap text-sm leading-relaxed text-black ${
          !expanded && longText ? "line-clamp-[16] lg:line-clamp-[20]" : ""
        }`}
      >
        {text}
      </p>
      {longText ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-2 text-xs font-semibold text-black/65 underline hover:text-black"
        >
          {expanded ? "Daha az göster" : "Devamını oku"}
        </button>
      ) : null}
    </div>
  );
}
