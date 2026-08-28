import { NextResponse } from "next/server";
import { requireAdminSessionClient } from "@/lib/admin-api";
import { fetchAdminQualityResubmitPending } from "@/lib/admin-quality-resubmit";

export async function GET() {
  const ctx = await requireAdminSessionClient();
  if (!ctx.ok) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  const items = await fetchAdminQualityResubmitPending(ctx.supabase);
  return NextResponse.json({ ok: true, items });
}
