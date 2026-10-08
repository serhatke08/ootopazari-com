import type { SupabasePublicEnv } from "@/lib/env";

const BUCKET = "listings-images";

function normalizeBucketPath(pathInsideBucket: string): string {
  return pathInsideBucket
    .replace(/^\/+/, "")
    .replace(new RegExp(`^${BUCKET}/`), "");
}

function extractPublicBucketPath(url: string): string | null {
  const cleaned = url
    .replace("/storage/v1/render/image/public/", "/storage/v1/object/public/")
    .replace("/storage/v1/render/image/sign/", "/storage/v1/object/sign/")
    .replace(/[?#].*$/, "");
  const m = cleaned.match(
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

/** Ham public URL — Image Transformation (`/render/image`) yok. */
export function listingImageDisplayUrl(
  env: SupabasePublicEnv,
  imageUrl: string | null | undefined
): string | null {
  return resolveListingImageUrl(env, imageUrl);
}

/**
 * Mobil ile uyumlu: `image_url` tam URL olabilir veya bucket içi göreli yol.
 */
export function resolveListingImageUrl(
  env: SupabasePublicEnv,
  imageUrl: string | null | undefined
): string | null {
  if (imageUrl == null || imageUrl === "") return null;
  const trimmed = String(imageUrl).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    const path = extractPublicBucketPath(trimmed);
    if (path) return publicListingImageUrl(env, path);
    return trimmed;
  }
  return publicListingImageUrl(env, trimmed);
}

const COVER_FALLBACK_FILES = [
  "0.jpg",
  "0.jpeg",
  "0.png",
  "0.webp",
  "0.heic",
  "1.jpg",
  "1.jpeg",
  "1.png",
];

/** Kartlarda denenecek kapak URL’leri (optimizer’sız yedekler dahil). */
export function listingCoverCandidateUrls(
  env: SupabasePublicEnv,
  imageUrl: string | null | undefined,
  listingId?: string | null
): string[] {
  const out: string[] = [];
  const push = (u: string | null | undefined) => {
    const v = u?.trim();
    if (v && !out.includes(v)) out.push(v);
  };

  push(listingImageDisplayUrl(env, imageUrl));
  push(resolveListingImageUrl(env, imageUrl));

  const id = listingId?.trim();
  if (id) {
    for (const name of COVER_FALLBACK_FILES) {
      const path = `${id}/${name}`;
      const publicUrl = publicListingImageUrl(env, path);
      if (/\.hei(c|f)$/i.test(name)) {
        push(listingImageDisplayUrl(env, publicUrl));
      }
      push(publicUrl);
    }
  }

  return out;
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
