"use client";

import Image from "next/image";
import { useState } from "react";
import type { SupabasePublicEnv } from "@/lib/env";
import { isHeicLikeUrl } from "@/lib/image-format";
import {
  isPublicListingImageUrl,
  listingImageDisplayUrl,
  resolveListingImageUrl,
} from "@/lib/storage";

type Props = {
  env: SupabasePublicEnv;
  imageUrl: string | null | undefined;
  alt: string;
  className?: string;
  sizes: string;
  objectFit?: "cover" | "contain";
  scale?: boolean;
};

export function ListingCoverImage({
  env,
  imageUrl,
  alt,
  className,
  sizes,
  objectFit = "cover",
  scale = false,
}: Props) {
  const display =
    listingImageDisplayUrl(env, imageUrl) ??
    resolveListingImageUrl(env, imageUrl);
  const raw = resolveListingImageUrl(env, imageUrl);

  const [src, setSrc] = useState(display);
  const [exhausted, setExhausted] = useState(false);

  if (!src || exhausted) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Görsel yok
      </div>
    );
  }

  const unoptimized =
    isHeicLikeUrl(src) ||
    isHeicLikeUrl(raw) ||
    isPublicListingImageUrl(env, src);

  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized={unoptimized}
      className={[
        objectFit === "cover" ? "object-cover" : "object-contain",
        "object-center transition duration-300 group-hover:opacity-[0.97]",
        scale ? "scale-[1.14]" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      sizes={sizes}
      onError={() => {
        if (raw && src !== raw) {
          setSrc(raw);
          return;
        }
        setExhausted(true);
      }}
    />
  );
}
