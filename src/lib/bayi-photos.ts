import type { SupabaseClient } from "@supabase/supabase-js";
import type { DealerProfile } from "@/lib/bayi-types";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const BUCKET = "bayi-application-docs";

export function parseBayiPhotoPaths(raw: unknown): string[] {
  if (raw == null || raw === "") return [];
  let value: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        value = JSON.parse(trimmed);
      } catch {
        return [trimmed];
      }
    } else {
      return [trimmed];
    }
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => parseBayiPhotoPaths(item));
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

export function firstBayiPhotoPath(dealer: DealerProfile): string | null {
  const app = dealer.application;
  const workplace = parseBayiPhotoPaths(app?.workplace_photos_json);
  if (workplace[0]) return workplace[0];
  const sign = app?.signboard_photo_storage_path?.trim();
  return sign || null;
}

function storagePathFromRaw(raw: string): string {
  const trimmed = raw.trim();
  const fromUrl = trimmed.match(
    /\/storage\/v1\/object\/(?:public|sign)\/bayi-application-docs\/([^?]+)/i
  );
  if (fromUrl?.[1]) return decodeURIComponent(fromUrl[1]);
  return trimmed.replace(/^\/+/, "").replace(new RegExp(`^${BUCKET}/`), "");
}

export async function signBayiPhotoUrl(
  supabase: SupabaseClient,
  rawPath: string
): Promise<string | null> {
  const trimmed = rawPath.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) && !trimmed.includes("/storage/v1/object/")) {
    return trimmed;
  }
  const path = storagePathFromRaw(trimmed);
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (!error && data?.signedUrl) return data.signedUrl;
  return null;
}

export async function enrichDealersWithCoverUrls(
  supabase: SupabaseClient,
  dealers: DealerProfile[]
): Promise<DealerProfile[]> {
  const signer = createSupabaseServiceClient() ?? supabase;
  return Promise.all(
    dealers.map(async (dealer) => {
      const path = firstBayiPhotoPath(dealer);
      if (!path) return { ...dealer, cover_image_url: null };
      const url = await signBayiPhotoUrl(signer, path);
      return { ...dealer, cover_image_url: url };
    })
  );
}
