import { NextResponse } from "next/server";
import {
  parseAdminListingTable,
  requireAdminServiceClient,
} from "@/lib/admin-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, context: RouteContext) {
  const auth = await requireAdminServiceClient();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, message: auth.message },
      { status: auth.status }
    );
  }

  const { id } = await context.params;
  const listingId = id?.trim();
  if (!listingId) {
    return NextResponse.json({ ok: false, error: "listingId" }, { status: 400 });
  }

  const url = new URL(req.url);
  const table = parseAdminListingTable(url.searchParams.get("table"));

  const { error } = await auth.service.from(table).delete().eq("id", listingId);
  if (error) {
    console.warn("admin delete listing:", error.message);
    return NextResponse.json(
      { ok: false, error: "delete_failed", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
