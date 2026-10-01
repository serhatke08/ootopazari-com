import { NextResponse } from "next/server";
import { resolveRequestUser } from "@/lib/supabase/request-user";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const BUCKET = "listing-drafts";

function draftPath(userId: string) {
  return `${userId}/draft.json`;
}

/**
 * App + web ortak ilan taslağı.
 * GET → { ok, draft } | { ok:true, draft:null }
 * PUT body { draft: object } → kaydet
 * DELETE → sil
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

  const { data, error } = await admin.storage
    .from(BUCKET)
    .download(draftPath(user.id));

  if (error || !data) {
    // not found
    return NextResponse.json({ ok: true, draft: null });
  }

  try {
    const text = await data.text();
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ ok: true, draft: null });
    }
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

  let body: { draft?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.draft || typeof body.draft !== "object") {
    return NextResponse.json({ error: "missing_draft" }, { status: 400 });
  }

  const draft = body.draft as Record<string, unknown>;
  // Yerel dosya yollarını buluta yazma (app↔web kırılır)
  if (Array.isArray(draft.imagePaths)) {
    draft.imagePaths = draft.imagePaths.filter(
      (p) => typeof p === "string" && /^https?:\/\//i.test(p)
    );
  }
  draft.updatedAt = new Date().toISOString();
  draft.source = draft.source ?? "unknown";

  const blob = new Blob([JSON.stringify(draft)], {
    type: "application/json",
  });
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(draftPath(user.id), blob, {
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

  await admin.storage.from(BUCKET).remove([draftPath(user.id)]);
  return NextResponse.json({ ok: true });
}
