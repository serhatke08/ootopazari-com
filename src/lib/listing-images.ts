import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabasePublicEnv } from "@/lib/env";
import { publicListingImageUrl, resolveListingImageUrl } from "@/lib/storage";

const BUCKET = "listings-images";

function pushUnique(out: string[], url: string | null) {
  if (url && !out.includes(url)) out.push(url);
}

function addPath(
  env: SupabasePublicEnv,
  out: string[],
  path: string | null | undefined
) {
  pushUnique(out, resolveListingImageUrl(env, path));
}

/** Tek `image_url` + olası çoklu alanlar (`images`, `image_urls`, JSON dizi, virgüllü string). */
export function collectListingGalleryUrls(
  env: SupabasePublicEnv,
  row: Record<string, unknown>,
  primary: string | null | undefined
): string[] {
  const out: string[] = [];

  addPath(env, out, primary);

  const raw =
    row.images ??
    row.image_urls ??
    row.gallery_images ??
    row.listing_images ??
    row.photos ??
    row.media;

  const consume = (v: unknown) => {
    if (v == null || v === "") return;
    if (typeof v === "string") {
      addPath(env, out, v);
      return;
    }
    if (typeof v === "object" && v && "url" in (v as object)) {
      addPath(env, out, String((v as { url: unknown }).url));
    }
  };

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string") addPath(env, out, item);
      else if (item && typeof item === "object") consume(item);
    }
  } else if (typeof raw === "string") {
    const s = raw.trim();
    if (s.startsWith("[") || s.startsWith("{")) {
      try {
        const p = JSON.parse(s) as unknown;
        if (Array.isArray(p)) {
          for (const item of p) {
            if (typeof item === "string") addPath(env, out, item);
            else consume(item);
          }
        }
      } catch {
        for (const part of s.split(/[;,]/).map((x) => x.trim()).filter(Boolean)) {
          addPath(env, out, part);
        }
      }
    } else {
      for (const part of s.split(/[;,]/).map((x) => x.trim()).filter(Boolean)) {
        addPath(env, out, part);
      }
    }
  }

  return out;
}

/**
 * `images` kolonu boş eski ilanlar için: depo klasöründeki `0.jpg`, `1.jpg`… dosyalarından
 * galeri URL’lerini üretir (sunucu tarafı; bucket list politikası izin vermeli).
 */
export async function collectListingGalleryUrlsWithStorageFallback(
  supabase: SupabaseClient,
  env: SupabasePublicEnv,
  row: Record<string, unknown>,
  primary: string | null | undefined
): Promise<string[]> {
  const fromRow = collectListingGalleryUrls(env, row, primary);
  if (fromRow.length > 1) return fromRow;

  const id = row.id != null ? String(row.id).trim() : "";
  if (!id) return fromRow;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(id, { limit: 100 });

  if (error || !data?.length) return fromRow;

  const names = data
    .map((o) => o.name)
    .filter((n) => /^\d+\.[a-z0-9]+$/i.test(n))
    .sort(
      (a, b) =>
        parseInt(a.split(".")[0]!, 10) - parseInt(b.split(".")[0]!, 10)
    );

  if (names.length === 0) return fromRow;

  const fromStorage = names.map((n) =>
    publicListingImageUrl(env, `${id}/${n}`)
  );
  return fromStorage;
}
