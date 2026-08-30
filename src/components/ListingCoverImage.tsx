"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { SupabasePublicEnv } from "@/lib/env";
import { listingCoverCandidateUrls } from "@/lib/storage";

type Props = {
  env: SupabasePublicEnv;
  imageUrl: string | null | undefined;
  listingId?: string | null;
  alt: string;
  className?: string;
  sizes: string;
  objectFit?: "cover" | "contain";
  scale?: boolean;
  priority?: boolean;
  /** true iken yalnızca ilk aday URL (hızlı ilk sıra). */
  fastPath?: boolean;
  /** true iken görsel isteği başlamaz (sıralı yükleme). */
  deferLoad?: boolean;
  fetchPriority?: "high" | "low" | "auto";
  onLoaded?: () => void;
};

export function ListingCoverImage({
  env,
  imageUrl,
  listingId,
  alt,
  className,
  sizes,
  objectFit = "cover",
  scale = false,
  priority = false,
  fastPath = false,
  deferLoad = false,
  fetchPriority = "auto",
  onLoaded,
}: Props) {
  const candidates = useMemo(() => {
    const all = listingCoverCandidateUrls(env, imageUrl, listingId);
    if (fastPath && all.length > 0) return [all[0]!];
    return all;
  }, [env, imageUrl, listingId, fastPath]);
  const [index, setIndex] = useState(0);
  const [useNative, setUseNative] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setIndex(0);
    setUseNative(false);
    setLoaded(false);
  }, [imageUrl, listingId]);

  const src = candidates[index] ?? null;
  const imgClass = [
    objectFit === "cover" ? "object-cover" : "object-contain",
    "object-center transition duration-150 group-hover:opacity-[0.97]",
    scale ? "scale-[1.14]" : "",
    loaded ? "opacity-100" : "opacity-0",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const markLoaded = () => {
    setLoaded(true);
    onLoaded?.();
  };

  const tryNext = () => {
    setLoaded(false);
    if (index + 1 < candidates.length) {
      setIndex((i) => i + 1);
      return;
    }
    if (!useNative) {
      setUseNative(true);
      setIndex(0);
      return;
    }
    markLoaded();
  };

  useEffect(() => {
    if (!deferLoad && candidates.length === 0) {
      onLoaded?.();
    }
  }, [candidates.length, deferLoad, onLoaded]);

  if (deferLoad) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-zinc-200">
        <div className="absolute inset-0 animate-pulse bg-zinc-200" aria-hidden />
      </div>
    );
  }

  if (!src) {
    return <div className="h-full w-full bg-zinc-100" aria-hidden />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-200">
      {!loaded ? (
        <div
          className="absolute inset-0 animate-pulse bg-zinc-200"
          aria-hidden
        />
      ) : null}
      {useNative ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`absolute inset-0 h-full w-full ${imgClass}`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={fetchPriority}
          onLoad={markLoaded}
          onError={tryNext}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          priority={priority}
          fetchPriority={fetchPriority}
          className={imgClass}
          sizes={sizes}
          onLoad={markLoaded}
          onError={tryNext}
        />
      )}
    </div>
  );
}
