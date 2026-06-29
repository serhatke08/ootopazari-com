import type { SupabasePublicEnv } from "@/lib/env";
import { isHeicLikeUrl } from "@/lib/image-format";

const BUCKET = "listings-images";

function normalizeBucketPath(pathInsideBucket: string): string {
  return pathInsideBucket
    .replace(/^\/+/, "")
    .replace(new RegExp(`^${BUCKET}/`), "");
}

function extractPublicBucketPath(url: string): string | null {
  const m = url.match(
    /\/storage\/v1\/object\/public\/listings-images\/(.+)$/i
  );
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

/** Profil fotoğrafları (Supabase Storage public bucket). */
export const AVATARS_BUCKET = "avatars";

/** Public URL for an object path inside `listings-images` (no leading slash on path segments). */
export function publicListingImageUrl(
  env: SupabasePublicEnv,
  pathInsideBucket: string
): string {
  const base = env.url.replace(/\/$/, "");
  const p = normalizeBucketPath(pathInsideBucket);
  return `${base}/storage/v1/object/public/${BUCKET}/${p}`;
}

/** HEIC/HEIF görselleri tarayıcıda göstermek için Supabase image render (webp). */
export function listingImageDisplayUrl(
  env: SupabasePublicEnv,
  imageUrl: string | null | undefined
): string | null {
  const resolved = resolveListingImageUrl(env, imageUrl);
  if (!resolved || !isHeicLikeUrl(resolved)) return resolved;

  const path = extractPublicBucketPath(resolved);
  if (!path) return resolved;

  const base = env.url.replace(/\/$/, "");
  return `${base}/storage/v1/render/image/public/${BUCKET}/${path}?format=webp&quality=85`;
}

/**
 * Mobil ile uyumlu: `image_url` tam URL olabilir veya bucket içi göreli yol.
 */
export function resolveListingImageUrl(
  env: SupabasePublicEnv,
  imageUrl: string | null | undefined
): string | null {
  if (imageUrl == null || imageUrl === "") return null;
  if (/^https?:\/\//i.test(imageUrl)) {
    const path = extractPublicBucketPath(imageUrl);
    if (path) return publicListingImageUrl(env, path);
    return imageUrl;
  }
  return publicListingImageUrl(env, imageUrl);
}

export function isPublicListingImageUrl(
  env: SupabasePublicEnv,
  imageUrl: string | null | undefined
): boolean {
  if (!imageUrl) return false;
  try {
    const url = new URL(imageUrl);
    const base = new URL(env.url);
    return (
      url.origin === base.origin &&
      url.pathname.startsWith(`/storage/v1/object/public/${BUCKET}/`)
    );
  } catch {
    return false;
  }
}

/** `avatars` bucket içi göreli yol → public URL (istemci `getPublicUrl` tercih edebilir). */
export function publicAvatarUrl(
  env: SupabasePublicEnv,
  pathInsideBucket: string
): string {
  const base = env.url.replace(/\/$/, "");
  const p = pathInsideBucket.replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/${AVATARS_BUCKET}/${p}`;
}
