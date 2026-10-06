import { NextResponse } from "next/server";
import { resolveRequestUser } from "@/lib/supabase/request-user";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  LISTING_DRAFT_BUCKET,
  draftJsonPath,
  ensureListingDraftBucket,
  extractDraftObjectPath,
  isHttpUrl,
  removeAllUserDraftFiles,
  resolveDraftImageUrlsForClient,
} from "@/lib/listing-draft-storage";

export const dynamic = "force-dynamic";

/**
 * App + web ortak ilan taslağı.
 * GET → { ok, draft } | { ok:true, draft:null }
 * PUT body { draft: object } → kaydet
 * DELETE → draft.json + görseller
 */
export async function GET(req: Request) {
  const { user } = await resolveRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_config" }, { status: 500 });
  }
  await ensureListingDraftBucket(admin);

  const { data, error } = await admin.storage
    .from(LISTING_DRAFT_BUCKET)
    .download(draftJsonPath(user.id));

  if (error || !data) {
    return NextResponse.json({ ok: true, draft: null });
  }

  try {
    const text = await data.text();
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ ok: true, draft: null });
    }
    parsed.imagePaths = await resolveDraftImageUrlsForClient(
      admin,
      user.id,
      parsed.imagePaths
    );
    return NextResponse.json({ ok: true, draft: parsed });
  } catch {
    return NextResponse.json({ ok: true, draft: null });
  }
}

export async function PUT(req: Request) {
  const { user } = await resolveRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_config" }, { status: 500 });
  }
  await ensureListingDraftBucket(admin);

  let body: { draft?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.draft || typeof body.draft !== "object") {
    return NextResponse.json({ error: "missing_draft" }, { status: 400 });
  }

  const draft = { ...(body.draft as Record<string, unknown>) };

  // Yerel dosya yollarını at; http URL veya storage path tut.
  if (Array.isArray(draft.imagePaths)) {
    const kept: string[] = [];
    for (const p of draft.imagePaths) {
      if (typeof p !== "string" || !p.trim()) continue;
      const objectPath = extractDraftObjectPath(user.id, p);
      if (objectPath) {
        kept.push(objectPath);
        continue;
      }
      if (isHttpUrl(p)) kept.push(p.trim());
    }
    draft.imagePaths = kept;
  }

  draft.updatedAt = new Date().toISOString();
  draft.source = draft.source ?? "unknown";

  const blob = new Blob([JSON.stringify(draft)], {
    type: "application/json",
  });
  const { error } = await admin.storage
    .from(LISTING_DRAFT_BUCKET)
    .upload(draftJsonPath(user.id), blob, {
      upsert: true,
      contentType: "application/json",
    });

  if (error) {
    return NextResponse.json(
      { error: "upload_failed", message: error.message },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
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
  await removeAllUserDraftFiles(admin, user.id);
  return NextResponse.json({ ok: true });
}
