import { NextResponse } from "next/server";
import { isSupportAgentUserId } from "@/lib/support-agent";
import {
  canAccessSupportThread,
  fetchSupportThreadServer,
  insertSupportMessageServer,
  notifySupportAgentOfMessage,
  notifyUserOfSupportReply,
} from "@/lib/support-chat-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Body = {
  threadId?: string;
  content?: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const threadId = body.threadId?.trim();
  const content = body.content?.trim();
  if (!threadId || !content) {
    return NextResponse.json({ error: "Mesaj boş olamaz." }, { status: 400 });
  }
  if (content.length > 4000) {
    return NextResponse.json({ error: "Mesaj çok uzun." }, { status: 400 });
  }

  const thread = await fetchSupportThreadServer(threadId);
  if (!thread) {
    return NextResponse.json({ error: "Sohbet bulunamadı." }, { status: 404 });
  }

  if (!canAccessSupportThread(thread, user.id)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const message = await insertSupportMessageServer({
    threadId,
    senderId: user.id,
    content,
  });

  if (!message) {
    return NextResponse.json(
      {
        error:
          "Mesaj gönderilemedi. Supabase'de support_messages tablosu kurulu mu kontrol edin.",
      },
      { status: 500 }
    );
  }

  const isSupportAgent = isSupportAgentUserId(user.id);
  if (isSupportAgent) {
    await notifyUserOfSupportReply({
      userId: thread.user_id,
      content,
    });
  } else {
    await notifySupportAgentOfMessage({
      threadUserId: thread.user_id,
      content,
    });
  }

  return NextResponse.json({ message });
}
