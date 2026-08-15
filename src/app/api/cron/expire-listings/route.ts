import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { maintainListingLifecycle } from "@/lib/listing-quota";

function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  if (secret) return auth === `Bearer ${secret}`;
  if (req.headers.get("x-vercel-cron") === "1") return true;
  return process.env.NODE_ENV !== "production";
}

export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "server_config" },
      { status: 500 }
    );
  }

  const result = await maintainListingLifecycle(admin);
  return NextResponse.json({ ok: true, ...result });
}
