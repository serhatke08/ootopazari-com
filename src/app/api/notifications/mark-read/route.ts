import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { notificationId?: unknown; markAll?: unknown };
  try {
    body = (await req.json()) as { notificationId?: unknown; markAll?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const markAll = body.markAll === true;
  const notificationId =
    typeof body.notificationId === "string" && body.notificationId.trim() !== ""
      ? body.notificationId.trim()
      : null;

  const now = new Date().toISOString();
  const mine = `user_id.eq.${user.id},recipient_id.eq.${user.id}`;
  // Web read_at + app is_read birlikte güncellenir — tek taraflı “okundu sıfırlandı” olmaz.
  const patch = { read_at: now, is_read: true };

  if (markAll) {
    const { error } = await supabase
      .from("user_notifications")
      .update(patch)
      .or(mine)
      .is("read_at", null);
    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 }
      );
    }
    // Eski app kayıtları: is_read=false ama read_at dolu kalmış olabilir
    await supabase
      .from("user_notifications")
      .update(patch)
      .or(mine)
      .eq("is_read", false);
    return NextResponse.json({ ok: true });
  }

  if (!notificationId) {
    return NextResponse.json({ ok: false, error: "notificationId" }, { status: 400 });
  }

  const { error, count } = await supabase
    .from("user_notifications")
    .update(patch, { count: "exact" })
    .eq("id", notificationId)
    .or(mine);

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
  if ((count ?? 0) < 1) {
    return NextResponse.json(
      { ok: false, message: "not_updated" },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
