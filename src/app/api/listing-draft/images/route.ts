import { NextResponse } from "next/server";
import { resolveRequestUser } from "@/lib/supabase/request-user";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  LISTING_DRAFT_BUCKET,
  draftImageObjectPath,
  draftImagesPrefix,
  ensureListingDraftBucket,
  listUserDraftFiles,
  signDraftPaths,
} from "@/lib/listing-draft-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILES = 10;
const MAX_BYTES = 12 * 1024 * 1024;

function extFor(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith(".png") || file.type === "image/png") return "png";
  if (name.endsWith(".webp") || file.type === "image/webp") return "webp";
  if (name.endsWith(".heic") || file.type === "image/heic") return "heic";
  if (name.endsWith(".heif") || file.type === "image/heif") return "heif";
  return "jpg";
}

/**
 * POST multipart: files[] — kullanıcının taslak görsellerini tamamen değiştirir.
 * DELETE — yalnızca images/ klasörünü temizler (draft.json kalır).
 */
export async function POST(req: Request) {
  const { user } = await resolveRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_config" }, { status: 500 });
  }
  await ensureListingDraftBucket(admin);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const files = form
    .getAll("files")
    .filter((f): f is File => typeof File !== "undefined" && f instanceof File);
  if (files.length === 0) {
    // boş gönderim = görselleri temizle
    const existing = (await listUserDraftFiles(admin, user.id)).filter((p) =>
      p.includes("/images/")
    );
    if (existing.length) {
      await admin.storage.from(LISTING_DRAFT_BUCKET).remove(existing);
    }
    return NextResponse.json({ ok: true, paths: [], urls: [] });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: "too_many_files" }, { status: 400 });
  }

  // Eski görselleri sil
  const existing = (await listUserDraftFiles(admin, user.id)).filter((p) =>
    p.startsWith(`${draftImagesPrefix(user.id)}/`)
  );
  if (existing.length) {
    await admin.storage.from(LISTING_DRAFT_BUCKET).remove(existing);
  }

  const paths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "invalid_file_size" }, { status: 400 });
    }
    const ext = extFor(file);
    const path = draftImageObjectPath(user.id, `${i}.${ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await admin.storage
      .from(LISTING_DRAFT_BUCKET)
      .upload(path, buffer, {
        upsert: true,
        contentType: file.type || `image/${ext}`,
      });
    if (error) {
      return NextResponse.json(
        { error: "upload_failed", message: error.message },
        { status: 502 }
      );
    }
    paths.push(path);
  }

  const urls = await signDraftPaths(admin, paths);
  return NextResponse.json({ ok: true, paths, urls });
}

export async function DELETE(req: Request) {
  const { user } = await resolveRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_config" }, { status: 500 });
  }
  await ensureListingDraftBucket(admin);
  const existing = (await listUserDraftFiles(admin, user.id)).filter((p) =>
    p.startsWith(`${draftImagesPrefix(user.id)}/`)
  );
  if (existing.length) {
    await admin.storage.from(LISTING_DRAFT_BUCKET).remove(existing);
  }
  return NextResponse.json({ ok: true });
}
