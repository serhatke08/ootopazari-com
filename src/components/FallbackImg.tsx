"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

/**
 * İlk URL yüklenmezse sıradakini dener. Çekmece / sol menü için düz &lt;img&gt; (Next Image değil).
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
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [primary, fallback]);

  if (urls.length === 0) return <>{placeholder ?? null}</>;

  if (index >= urls.length) return <>{placeholder ?? null}</>;

  const src = urls[index];

  return (
    <img
      key={src}
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
