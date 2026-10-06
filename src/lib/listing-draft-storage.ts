import type { SupabaseClient } from "@supabase/supabase-js";

export const LISTING_DRAFT_BUCKET = "listing-drafts";

export function draftJsonPath(userId: string) {
  return `${userId}/draft.json`;
}

export function draftImagesPrefix(userId: string) {
  return `${userId}/images`;
}

export function draftImageObjectPath(userId: string, fileName: string) {
  return `${draftImagesPrefix(userId)}/${fileName}`;
}

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/** draft.json içindeki path veya URL → bucket object path (yoksa null). */
export function extractDraftObjectPath(
  userId: string,
  value: string
): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (!isHttpUrl(raw)) {
    const cleaned = raw.replace(/^\/+/, "");
    if (cleaned.startsWith(`${userId}/`)) return cleaned;
    if (cleaned.startsWith("images/")) return `${userId}/${cleaned}`;
    return null;
  }
  try {
    const u = new URL(raw);
    const marker = `/storage/v1/object/public/${LISTING_DRAFT_BUCKET}/`;
    const signMarker = `/storage/v1/object/sign/${LISTING_DRAFT_BUCKET}/`;
    const path = u.pathname;
    for (const m of [marker, signMarker]) {
      const idx = path.indexOf(m);
      if (idx >= 0) {
        const rest = decodeURIComponent(path.slice(idx + m.length));
        return rest.split("?")[0] || null;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function ensureListingDraftBucket(
  admin: SupabaseClient
): Promise<void> {
  try {
    const { data } = await admin.storage.getBucket(LISTING_DRAFT_BUCKET);
    if (data) return;
  } catch {
    /* create below */
  }
  try {
    await admin.storage.createBucket(LISTING_DRAFT_BUCKET, {
      public: false,
      fileSizeLimit: 15 * 1024 * 1024,
      allowedMimeTypes: [
        "application/json",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
      ],
    });
  } catch {
    /* race / already exists */
  }
}

export async function listUserDraftFiles(
  admin: SupabaseClient,
  userId: string
): Promise<string[]> {
  const out: string[] = [];
  const { data: root } = await admin.storage
    .from(LISTING_DRAFT_BUCKET)
    .list(userId, { limit: 100 });
  for (const item of root ?? []) {
    if (!item?.name) continue;
    if (item.id == null && item.name === "images") {
      const { data: imgs } = await admin.storage
        .from(LISTING_DRAFT_BUCKET)
        .list(draftImagesPrefix(userId), { limit: 100 });
      for (const img of imgs ?? []) {
        if (img?.name) out.push(draftImageObjectPath(userId, img.name));
      }
      continue;
    }
    out.push(`${userId}/${item.name}`);
  }
  // images may appear only as folder without id in some API versions
  if (!out.some((p) => p.includes("/images/"))) {
    const { data: imgs } = await admin.storage
      .from(LISTING_DRAFT_BUCKET)
      .list(draftImagesPrefix(userId), { limit: 100 });
    for (const img of imgs ?? []) {
      if (img?.name) out.push(draftImageObjectPath(userId, img.name));
    }
  }
  return Array.from(new Set(out));
}

export async function removeAllUserDraftFiles(
  admin: SupabaseClient,
  userId: string
): Promise<void> {
  const paths = await listUserDraftFiles(admin, userId);
  // always try draft.json
  const all = Array.from(new Set([...paths, draftJsonPath(userId)]));
  if (all.length === 0) return;
  await admin.storage.from(LISTING_DRAFT_BUCKET).remove(all);
}

export async function signDraftPaths(
  admin: SupabaseClient,
  paths: string[],
  expiresSec = 60 * 60 * 24 * 7
): Promise<string[]> {
  const urls: string[] = [];
  for (const path of paths) {
    const { data, error } = await admin.storage
      .from(LISTING_DRAFT_BUCKET)
      .createSignedUrl(path, expiresSec);
    if (!error && data?.signedUrl) urls.push(data.signedUrl);
  }
  return urls;
}

export async function resolveDraftImageUrlsForClient(
  admin: SupabaseClient,
  userId: string,
  imagePaths: unknown
): Promise<string[]> {
  if (!Array.isArray(imagePaths)) return [];
  const paths: string[] = [];
  const passthrough: string[] = [];
  for (const raw of imagePaths) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    const objectPath = extractDraftObjectPath(userId, raw);
    if (objectPath) paths.push(objectPath);
    else if (isHttpUrl(raw)) passthrough.push(raw.trim());
  }
  const signed = paths.length ? await signDraftPaths(admin, paths) : [];
  return [...signed, ...passthrough];
}
