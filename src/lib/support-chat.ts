import type { SupabaseClient } from "@supabase/supabase-js";

export type SupportThreadRow = {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type SupportMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export type SupportThreadSummary = SupportThreadRow & {
  userDisplayName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
};

export async function getOrCreateSupportThread(
  supabase: SupabaseClient,
  userId: string
): Promise<SupportThreadRow | null> {
  const { data: existing, error: existingErr } = await supabase
    .from("support_threads")
    .select("id,user_id,created_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingErr) {
    console.warn("support_threads select:", existingErr.message);
    return null;
  }
  if (existing) return existing as SupportThreadRow;

  const { data: inserted, error: insertErr } = await supabase
    .from("support_threads")
    .insert({ user_id: userId })
    .select("id,user_id,created_at,updated_at")
    .single();

  if (insertErr) {
    console.warn("support_threads insert:", insertErr.message);
    return null;
  }
  return inserted as SupportThreadRow;
}

export async function fetchSupportMessages(
  supabase: SupabaseClient,
  threadId: string
): Promise<SupportMessageRow[]> {
  const { data, error } = await supabase
    .from("support_messages")
    .select("id,thread_id,sender_id,content,created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("support_messages:", error.message);
    return [];
  }
  return (data ?? []) as SupportMessageRow[];
}

export async function fetchSupportThreadById(
  supabase: SupabaseClient,
  threadId: string
): Promise<SupportThreadRow | null> {
  const { data, error } = await supabase
    .from("support_threads")
    .select("id,user_id,created_at,updated_at")
    .eq("id", threadId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.warn("support_thread by id:", error.message);
    return null;
  }
  return data as SupportThreadRow;
}

export async function fetchAllSupportThreadsForAdmin(
  supabase: SupabaseClient
): Promise<SupportThreadSummary[]> {
  const { data: threads, error } = await supabase
    .from("support_threads")
    .select("id,user_id,created_at,updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.warn("support_threads admin list:", error.message);
    return [];
  }

  const rows = (threads ?? []) as SupportThreadRow[];
  if (rows.length === 0) return [];

  const threadIds = rows.map((t) => t.id);
  const userIds = [...new Set(rows.map((t) => t.user_id))];

  const [{ data: messages }, { data: profiles }] = await Promise.all([
    supabase
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

  return rows.map((thread) => {
    const last = lastByThread.get(thread.id);
    return {
      ...thread,
      userDisplayName: profileMap.get(thread.user_id) ?? "Kullanıcı",
      lastMessage: last?.content ?? null,
      lastMessageAt: last?.created_at ?? null,
    };
  });
}
