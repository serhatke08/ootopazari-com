import { NextResponse } from "next/server";
import {
  canAccessSupportThread,
  fetchSupportMessagesServer,
  fetchSupportThreadServer,
} from "@/lib/support-chat-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }

  const threadId = new URL(request.url).searchParams.get("threadId")?.trim();
  if (!threadId) {
    return NextResponse.json({ error: "threadId gerekli." }, { status: 400 });
  }

  const thread = await fetchSupportThreadServer(threadId);
  if (!thread) {
    return NextResponse.json({ error: "Sohbet bulunamadı." }, { status: 404 });
  }

  if (!canAccessSupportThread(thread, user.id)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const messages = await fetchSupportMessagesServer(threadId);
  return NextResponse.json({ messages });
}
