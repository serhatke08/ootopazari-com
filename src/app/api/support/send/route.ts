import { NextResponse } from "next/server";
import { allowRateLimit } from "@/lib/api-rate-limit";
import { isSupportAgentUserId } from "@/lib/support-agent";
import {
  findOrCreateSupportConversation,
  sendSupportMessage,
} from "@/lib/support-chat-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Body = {
  conversationId?: string;
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

  if (!allowRateLimit(`support:${user.id}`, 30, 60_000)) {
    return NextResponse.json(
      { error: "Çok fazla mesaj. Biraz bekleyin." },
      { status: 429 }
    );
  }

  if (isSupportAgentUserId(user.id)) {
    return NextResponse.json(
      { error: "Destek hesabı yanıtları Mesajlar üzerinden gönderilir." },
      { status: 400 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "Mesaj boş olamaz." }, { status: 400 });
  }
  if (content.length > 4000) {
    return NextResponse.json({ error: "Mesaj çok uzun." }, { status: 400 });
  }

  let conversationId = body.conversationId?.trim();
  if (!conversationId) {
    const conversation = await findOrCreateSupportConversation(user.id);
    conversationId = conversation?.id;
  }

  if (!conversationId) {
    return NextResponse.json(
      { error: "Destek sohbeti oluşturulamadı." },
      { status: 500 }
    );
  }

  const message = await sendSupportMessage({
    conversationId,
    senderId: user.id,
    content,
  });

  if (!message) {
    return NextResponse.json({ error: "Mesaj gönderilemedi." }, { status: 500 });
  }

  return NextResponse.json({ message, conversationId });
}
