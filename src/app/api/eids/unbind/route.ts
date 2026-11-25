import { NextResponse } from "next/server";
import { unbindEidsFromCurrentProfile } from "@/lib/eids-bind";
import { resolveRequestUser } from "@/lib/supabase/request-user";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/** Bu hesabın e-Devlet bağını koparır. */
export async function POST(req: Request) {
  const { user } = await resolveRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_config" }, { status: 500 });
  }

  const result = await unbindEidsFromCurrentProfile(admin, user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
