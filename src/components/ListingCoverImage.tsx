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
}: Props) {
  const candidates = useMemo(
    () => listingCoverCandidateUrls(env, imageUrl, listingId),
    [env, imageUrl, listingId]
  );
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
    "object-center transition duration-300 group-hover:opacity-[0.97]",
    scale ? "scale-[1.14]" : "",
    loaded ? "opacity-100" : "opacity-0",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!src) {
    return <div className="h-full w-full bg-zinc-100" aria-hidden />;
  }

  const tryNext = () => {
    setLoaded(false);
    if (index + 1 < candidates.length) {
      setIndex((i) => i + 1);
      return;
    }
    if (!useNative) {
      setUseNative(true);
      setIndex(0);
    }
  };

  const markLoaded = () => setLoaded(true);

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
          className={imgClass}
          sizes={sizes}
          onLoad={markLoaded}
          onError={tryNext}
        />
      )}
    </div>
  );
}
