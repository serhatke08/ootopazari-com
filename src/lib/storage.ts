import type { SupabasePublicEnv } from "@/lib/env";

const BUCKET = "listings-images";

/** Profil fotoğrafları (Supabase Storage public bucket). */
export const AVATARS_BUCKET = "avatars";

/** Public URL for an object path inside `listings-images` (no leading slash on path segments). */
export function publicListingImageUrl(
  env: SupabasePublicEnv,
  pathInsideBucket: string
): string {
  const base = env.url.replace(/\/$/, "");
  const p = pathInsideBucket.replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${p}`;
}

/**
 * Mobil ile uyumlu: `image_url` tam URL olabilir veya bucket içi göreli yol.
 */
export function resolveListingImageUrl(
  env: SupabasePublicEnv,
  imageUrl: string | null | undefined
): string | null {
  if (imageUrl == null || imageUrl === "") return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return publicListingImageUrl(env, imageUrl);
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
