"use client";

import { useState } from "react";
import type { ReactNode } from "react";

function FallbackImgInner({
  urls,
  className,
  alt = "",
  placeholder,
}: {
  urls: string[];
  className?: string;
  alt?: string;
  placeholder?: ReactNode;
}) {
  const [index, setIndex] = useState(0);

  if (urls.length === 0) return <>{placeholder ?? null}</>;
  if (index >= urls.length) return <>{placeholder ?? null}</>;

  const src = urls[index];

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="eager"
      decoding="async"
      draggable={false}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

/**
 * İlk URL yüklenmezse sıradakini dener. Çekmece / sol menü için düz img (Next Image değil).
 */
export function FallbackImg({
  primary,
  fallback,
  className,
  alt = "",
  placeholder,
}: {
  primary: string | null | undefined;
  fallback: string | null | undefined;
  className?: string;
  alt?: string;
  placeholder?: ReactNode;
}) {
  const urls = [
    ...new Set(
      [primary, fallback].filter(
        (u): u is string => typeof u === "string" && u.length > 0
      )
    ),
  ];

  return (
    <FallbackImgInner
      key={urls.join("\0")}
      urls={urls}
      className={className}
      alt={alt}
      placeholder={placeholder}
    />
  );
}
