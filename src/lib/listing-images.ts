import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabasePublicEnv } from "@/lib/env";
import {
  listingImageDisplayUrl,
  publicListingImageUrl,
  resolveListingImageUrl,
} from "@/lib/storage";

const BUCKET = "listings-images";

function pushUnique(out: string[], url: string | null) {
  if (url && !out.includes(url)) out.push(url);
}

function addPath(
  env: SupabasePublicEnv,
  out: string[],
  path: string | null | undefined
) {
  const resolved = listingImageDisplayUrl(env, path) ?? resolveListingImageUrl(env, path);
  pushUnique(out, resolved);
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

/** `image_url` boş veya geçersizse depodan kapak görseli bulur (kartlar için). */
export async function resolveListingCoverImageUrl(
  supabase: SupabaseClient,
  env: SupabasePublicEnv,
  row: Record<string, unknown>
): Promise<string | null> {
  const primary = row.image_url as string | null | undefined;
  const fromField =
    listingImageDisplayUrl(env, primary) ?? resolveListingImageUrl(env, primary);
  if (fromField) return fromField;

  const urls = await collectListingGalleryUrlsWithStorageFallback(
    supabase,
    env,
    row,
    null
  );
  return urls[0] ?? null;
}

/** Ana sayfa feed: kapak görseli eksik ilanları depodan tamamlar. */
export async function enrichListingRowsCoverImages(
  supabase: SupabaseClient,
  env: SupabasePublicEnv,
  rows: Record<string, unknown>[]
): Promise<void> {
  const missing = rows.filter((r) => {
    const url = r.image_url as string | null | undefined;
    return !resolveListingImageUrl(env, url);
  });
  if (missing.length === 0) return;

  await Promise.all(
    missing.map(async (row) => {
      const cover = await resolveListingCoverImageUrl(supabase, env, row);
      if (cover) row.image_url = cover;
    })
  );
}
