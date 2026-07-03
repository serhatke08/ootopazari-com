import { NextResponse } from "next/server";
import { isSupportAgentUserId } from "@/lib/support-agent";
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

  const { data: thread, error: threadErr } = await supabase
    .from("support_threads")
    .select("id,user_id")
    .eq("id", threadId)
    .maybeSingle();

  if (threadErr || !thread) {
    return NextResponse.json({ error: "Sohbet bulunamadı." }, { status: 404 });
  }

  const isOwner = String(thread.user_id) === user.id;
  const isSupportAgent = isSupportAgentUserId(user.id);
  if (!isOwner && !isSupportAgent) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const { data: message, error: insertErr } = await supabase
    .from("support_messages")
    .insert({
      thread_id: threadId,
      sender_id: user.id,
      content,
    })
    .select("id,thread_id,sender_id,content,created_at")
    .single();

  if (insertErr || !message) {
    return NextResponse.json(
      { error: insertErr?.message ?? "Mesaj gönderilemedi." },
      { status: 500 }
    );
  }

  return NextResponse.json({ message });
}
