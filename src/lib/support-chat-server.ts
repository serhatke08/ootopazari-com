import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupportAgentUserId,
  isSupportConversation,
  SUPPORT_AGENT_DISPLAY_NAME,
} from "@/lib/support-agent";
import type { ConversationRow, MessageRow } from "@/lib/messages";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export { isSupportConversation };

function serviceClient() {
  const client = createSupabaseServiceClient();
  if (!client) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY eksik.");
  }
  return client;
}

async function findConversationBetweenPair(
  admin: SupabaseClient,
  userA: string,
  userB: string
): Promise<ConversationRow | null> {
  const { data: one } = await admin
    .from("conversations")
    .select("id,listing_id,sender_id,receiver_id,updated_at,created_at")
    .eq("sender_id", userA)
    .eq("receiver_id", userB)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (one) return one as ConversationRow;

  const { data: two } = await admin
    .from("conversations")
    .select("id,listing_id,sender_id,receiver_id,updated_at,created_at")
    .eq("sender_id", userB)
    .eq("receiver_id", userA)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  return (two as ConversationRow | null) ?? null;
}

/**
 * Destek konuşması için anchor ilan (conversations.listing_id zorunluysa).
 * Destek hesabına ait gizli "Destek" ilanı oluşturur / bulur.
 */
async function ensureSupportListingId(admin: SupabaseClient): Promise<string | null> {
  const agentId = getSupportAgentUserId();

  const { data: existing } = await admin
    .from("listings")
    .select("id")
    .eq("user_id", agentId)
    .eq("title", SUPPORT_AGENT_DISPLAY_NAME)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return String(existing.id);

  const { data: inserted, error } = await admin
    .from("listings")
    .insert({
      user_id: agentId,
      title: SUPPORT_AGENT_DISPLAY_NAME,
      description: "Uygulama içi destek sohbeti",
      moderation_status: "approved",
      price: 0,
    })
    .select("id")
    .single();

  if (error || !inserted?.id) {
    console.error("ensureSupportListingId:", error?.message);
    return null;
  }
  return String(inserted.id);
}

/**
 * Kullanıcı ile destek hesabı arasında uygulama içi konuşma bulur / oluşturur.
 * Mesajlar normal `conversations` + `messages` tablolarına yazılır.
 */
export async function findOrCreateSupportConversation(
  userId: string
): Promise<ConversationRow | null> {
  const agentId = getSupportAgentUserId();
  if (userId === agentId) {
    return null;
  }

  const admin = serviceClient();
  const existing = await findConversationBetweenPair(admin, userId, agentId);
  if (existing) return existing;

  const listingId = await ensureSupportListingId(admin);

  const attempts: Record<string, string>[] = [
    {
      sender_id: userId,
      receiver_id: agentId,
      ...(listingId ? { listing_id: listingId } : {}),
    },
  ];

  // listing_id zorunluysa ve anchor ilan yoksa yine dene (bazı şemalarda null kabul edilir)
  if (listingId) {
    attempts.push({ sender_id: userId, receiver_id: agentId });
  }

  for (const payload of attempts) {
    const { data: inserted, error } = await admin
      .from("conversations")
      .insert(payload)
      .select("id,listing_id,sender_id,receiver_id,updated_at,created_at")
      .single();

    if (!error && inserted) {
      return inserted as ConversationRow;
    }
    console.error("findOrCreateSupportConversation:", error?.message);
  }

  return null;
}

export async function fetchSupportMessages(
  conversationId: string
): Promise<MessageRow[]> {
  const admin = serviceClient();
  const { data, error } = await admin
    .from("messages")
    .select("id,conversation_id,sender_id,content,is_read,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchSupportMessages:", error.message);
    return [];
  }
  return (data ?? []) as MessageRow[];
}

export async function sendSupportMessage(input: {
  conversationId: string;
  senderId: string;
  content: string;
}): Promise<MessageRow | null> {
  const admin = serviceClient();

  const { data: conv, error: convErr } = await admin
    .from("conversations")
    .select("id,sender_id,receiver_id")
    .eq("id", input.conversationId)
    .maybeSingle();

  if (convErr || !conv) {
    console.error("sendSupportMessage conv:", convErr?.message);
    return null;
  }

  const isParticipant =
    conv.sender_id === input.senderId || conv.receiver_id === input.senderId;
  if (!isParticipant || !isSupportConversation(conv as ConversationRow)) {
    return null;
  }

  const { data: message, error } = await admin
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      content: input.content,
      is_read: false,
    })
    .select("id,conversation_id,sender_id,content,is_read,created_at")
    .single();

  if (error || !message) {
    console.error("sendSupportMessage:", error?.message);
    return null;
  }

  await admin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.conversationId);

  return message as MessageRow;
}
