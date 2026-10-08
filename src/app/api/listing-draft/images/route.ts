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
import { compressListingImageBuffer } from "@/lib/compress-listing-image-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILES = 10;
const MAX_BYTES = 12 * 1024 * 1024;


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
    const raw = Buffer.from(await file.arrayBuffer());
    const compressed = await compressListingImageBuffer(raw);
    const path = draftImageObjectPath(user.id, `${i}.${compressed.ext}`);
    const { error } = await admin.storage
      .from(LISTING_DRAFT_BUCKET)
      .upload(path, compressed.buffer, {
        upsert: true,
        contentType: compressed.contentType,
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
