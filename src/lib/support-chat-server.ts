import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupportAgentUserId, isSupportAgentUserId } from "@/lib/support-agent";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { SupportMessageRow, SupportThreadRow } from "@/lib/support-chat";

function serviceClient() {
  const client = createSupabaseServiceClient();
  if (!client) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY eksik.");
  }
  return client;
}

export async function ensureSupportThreadServer(
  userId: string
): Promise<SupportThreadRow | null> {
  const admin = serviceClient();

  const { data: existing, error: existingErr } = await admin
    .from("support_threads")
    .select("id,user_id,created_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingErr) {
    console.error("ensureSupportThread select:", existingErr.message);
    return null;
  }
  if (existing) return existing as SupportThreadRow;

  const { data: inserted, error: insertErr } = await admin
    .from("support_threads")
    .insert({ user_id: userId })
    .select("id,user_id,created_at,updated_at")
    .single();

  if (insertErr) {
    console.error("ensureSupportThread insert:", insertErr.message);
    return null;
  }
  return inserted as SupportThreadRow;
}

export async function fetchSupportThreadServer(
  threadId: string
): Promise<SupportThreadRow | null> {
  const admin = serviceClient();
  const { data, error } = await admin
    .from("support_threads")
    .select("id,user_id,created_at,updated_at")
    .eq("id", threadId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("fetchSupportThread:", error.message);
    return null;
  }
  return data as SupportThreadRow;
}

export function canAccessSupportThread(
  thread: SupportThreadRow,
  userId: string
): boolean {
  return thread.user_id === userId || isSupportAgentUserId(userId);
}

export async function fetchSupportMessagesServer(
  threadId: string
): Promise<SupportMessageRow[]> {
  const admin = serviceClient();
  const { data, error } = await admin
    .from("support_messages")
    .select("id,thread_id,sender_id,content,created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchSupportMessages:", error.message);
    return [];
  }
  return (data ?? []) as SupportMessageRow[];
}

export async function insertSupportMessageServer(input: {
  threadId: string;
  senderId: string;
  content: string;
}): Promise<SupportMessageRow | null> {
  const admin = serviceClient();
  const { data, error } = await admin
    .from("support_messages")
    .insert({
      thread_id: input.threadId,
      sender_id: input.senderId,
      content: input.content,
    })
    .select("id,thread_id,sender_id,content,created_at")
    .single();

  if (error || !data) {
    console.error("insertSupportMessage:", error?.message);
    return null;
  }
  return data as SupportMessageRow;
}

export async function notifySupportAgentOfMessage(input: {
  threadUserId: string;
  content: string;
}): Promise<void> {
  const admin = serviceClient();
  const supportAgentId = getSupportAgentUserId();
  if (input.threadUserId === supportAgentId) return;

  const preview =
    input.content.length > 120
      ? `${input.content.slice(0, 117)}…`
      : input.content;

  const { error } = await admin.from("user_notifications").insert({
    user_id: supportAgentId,
    type: "support_message",
    title: "Yeni destek mesajı",
    body: preview,
    listing_id: null,
  });

  if (error) {
    console.warn("support notification:", error.message);
  }
}

export async function notifyUserOfSupportReply(input: {
  userId: string;
  content: string;
}): Promise<void> {
  const admin = serviceClient();
  const preview =
    input.content.length > 120
      ? `${input.content.slice(0, 117)}…`
      : input.content;

  const { error } = await admin.from("user_notifications").insert({
    user_id: input.userId,
    type: "support_reply",
    title: "Destek yanıtı",
    body: preview,
    listing_id: null,
  });

  if (error) {
    console.warn("support reply notification:", error.message);
  }
}

export async function fetchSupportThreadsForAgentServer(
  supabase: SupabaseClient
): Promise<
  Array<
    SupportThreadRow & {
      userDisplayName: string;
      lastMessage: string | null;
      lastMessageAt: string | null;
    }
  >
> {
  const admin = serviceClient();
  const supportAgentId = getSupportAgentUserId();

  const { data: threads, error } = await admin
    .from("support_threads")
    .select("id,user_id,created_at,updated_at")
    .neq("user_id", supportAgentId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("fetchSupportThreadsForAgent:", error.message);
    return [];
  }

  const rows = (threads ?? []) as SupportThreadRow[];
  if (rows.length === 0) return [];

  const threadIds = rows.map((t) => t.id);
  const userIds = [...new Set(rows.map((t) => t.user_id))];

  const [{ data: messages }, { data: profiles }] = await Promise.all([
    admin
      .from("support_messages")
      .select("thread_id,content,created_at")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id,full_name,username").in("id", userIds),
  ]);

  const profileMap = new Map<string, string>();
  for (const row of profiles ?? []) {
    const full = row.full_name != null ? String(row.full_name).trim() : "";
    const username = row.username != null ? String(row.username).trim() : "";
    profileMap.set(String(row.id), full || username || "Kullanıcı");
  }

  const lastByThread = new Map<string, { content: string; created_at: string }>();
  for (const row of messages ?? []) {
    const threadId = String(row.thread_id);
    if (lastByThread.has(threadId)) continue;
    lastByThread.set(threadId, {
      content: String(row.content),
      created_at: String(row.created_at),
    });
  }

  return rows
    .filter((thread) => lastByThread.has(thread.id))
    .map((thread) => {
      const last = lastByThread.get(thread.id)!;
      return {
        ...thread,
        userDisplayName: profileMap.get(thread.user_id) ?? "Kullanıcı",
        lastMessage: last.content,
        lastMessageAt: last.created_at,
      };
    });
}
