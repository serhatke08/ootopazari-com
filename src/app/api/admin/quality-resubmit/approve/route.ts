import { NextResponse } from "next/server";
import { parseAdminListingTable, requireAdminSessionClient } from "@/lib/admin-api";
import { approveAdminQualityResubmit } from "@/lib/admin-quality-resubmit";

export async function POST(req: Request) {
  const ctx = await requireAdminSessionClient();
  if (!ctx.ok) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  let body: { listingId?: unknown; storageTable?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const listingId =
    typeof body.listingId === "string" && body.listingId.trim() !== ""
      ? body.listingId.trim()
      : null;
  if (!listingId) {
    return NextResponse.json({ ok: false, error: "listingId" }, { status: 400 });
  }

  const storageTable = parseAdminListingTable(body.storageTable);
  const result = await approveAdminQualityResubmit(
    ctx.supabase,
    listingId,
    storageTable
  );

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "approve_failed" },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
