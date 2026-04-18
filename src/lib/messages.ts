import type { SupabaseClient } from "@supabase/supabase-js";

/** Okunmamış: `false` veya `null` (Postgres’te varsayılan / eski satırlar null olabilir). */
export const MESSAGES_UNREAD_FILTER = "is_read.is.null,is_read.eq.false";

/** Mobil / SQL şeması ile uyumlu (011_messages benzeri). */
export type ConversationRow = {
  id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  updated_at: string | null;
  created_at?: string | null;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean | null;
  created_at: string | null;
};

/** Engellenen kullanıcı id’leri (iki yön). */
export async function fetchBlockedPeerIds(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const set = new Set<string>();
  const [{ data: out }, { data: inc }] = await Promise.all([
    supabase.from("user_blocks").select("blocked_id").eq("blocker_id", userId),
    supabase.from("user_blocks").select("blocker_id").eq("blocked_id", userId),
  ]);
  for (const r of out ?? []) {
    const id = (r as { blocked_id?: string }).blocked_id;
    if (id) set.add(String(id));
  }
  for (const r of inc ?? []) {
    const id = (r as { blocker_id?: string }).blocker_id;
    if (id) set.add(String(id));
  }
  return set;
}

export async function fetchConversationsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<ConversationRow[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id,listing_id,sender_id,receiver_id,updated_at,created_at")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.warn("conversations:", error.message);
    return [];
  }
  return (data ?? []) as ConversationRow[];
}

export function otherParticipantId(c: ConversationRow, userId: string): string {
  return c.sender_id === userId ? c.receiver_id : c.sender_id;
}

export async function fetchConversationById(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<ConversationRow | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id,listing_id,sender_id,receiver_id,updated_at,created_at")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.warn("conversation by id:", error.message);
    return null;
  }
  const row = data as ConversationRow;
  if (row.sender_id !== userId && row.receiver_id !== userId) return null;
  return row;
}

export async function fetchMessagesForConversation(
  supabase: SupabaseClient,
  conversationId: string
): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id,conversation_id,sender_id,content,is_read,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("messages:", error.message);
    return [];
  }
  return (data ?? []) as MessageRow[];
}

/** Konuşma başına son mesaj (önizleme). */
export async function fetchLastMessagesByConversationIds(
  supabase: SupabaseClient,
  conversationIds: string[]
): Promise<Map<string, Pick<MessageRow, "content" | "created_at" | "sender_id">>> {
  const map = new Map<
    string,
    Pick<MessageRow, "content" | "created_at" | "sender_id">
  >();
  if (conversationIds.length === 0) return map;

  const { data, error } = await supabase
    .from("messages")
    .select("conversation_id,content,created_at,sender_id")
    .in("conversation_id", conversationIds);

  if (error || !data) {
    if (error) console.warn("last messages batch:", error.message);
    return map;
  }

  const byConv = new Map<string, MessageRow[]>();
  for (const row of data as MessageRow[]) {
    const cid = row.conversation_id;
    const arr = byConv.get(cid) ?? [];
    arr.push(row);
    byConv.set(cid, arr);
  }
  for (const [cid, rows] of byConv) {
    rows.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
    const last = rows[0];
    if (last) {
      map.set(cid, {
        content: last.content,
        created_at: last.created_at,
        sender_id: last.sender_id,
      });
    }
  }
  return map;
}

/** Okunmamış gelen mesaj sayısı (rozet). */
export async function countUnreadMessages(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const convs = await fetchConversationsForUser(supabase, userId);
  const ids = convs.map((c) => c.id);
  if (ids.length === 0) return 0;

  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .in("conversation_id", ids)
    .neq("sender_id", userId)
    .or(MESSAGES_UNREAD_FILTER);

  if (error) {
    if (error.message) console.warn("unread messages count:", error.message);
    return 0;
  }
  return count ?? 0;
}

export type ListingMessageSummary = {
  id: string;
  title: string | null;
  image_url: string | null;
  listing_number: number | string | null;
};

export async function fetchListingSummariesByIds(
  supabase: SupabaseClient,
  listingIds: string[]
): Promise<Map<string, ListingMessageSummary>> {
  const map = new Map<string, ListingMessageSummary>();
  if (listingIds.length === 0) return map;
  const { data, error } = await supabase
    .from("listings")
    .select("id,title,image_url,listing_number")
    .in("id", listingIds);

  if (error) {
    console.warn("listings batch (messages):", error.message);
    return map;
  }
  for (const row of data ?? []) {
    const r = row as ListingMessageSummary;
    if (r.id) map.set(String(r.id), r);
  }
  return map;
}

export type ProfileMessageSummary = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export async function fetchProfilesByIds(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, ProfileMessageSummary>> {
  const map = new Map<string, ProfileMessageSummary>();
  if (userIds.length === 0) return map;
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,username,avatar_url")
    .in("id", userIds);

  if (error) {
    console.warn("profiles batch (messages):", error.message);
    return map;
  }
  for (const row of data ?? []) {
    const r = row as ProfileMessageSummary;
    if (r.id) map.set(String(r.id), r);
  }
  return map;
}

export function profileDisplayName(p: ProfileMessageSummary | null): string {
  if (!p) return "Kullanıcı";
  const fn = p.full_name != null ? String(p.full_name).trim() : "";
  if (fn) return fn;
  const un = p.username != null ? String(p.username).trim() : "";
  if (un) return un;
  return "Kullanıcı";
}

/** Konuşma başına, karşı tarafın okunmamış mesajları (ben alıcıyken). */
export async function fetchUnreadCountsByConversation(
  supabase: SupabaseClient,
  userId: string,
  conversationIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (conversationIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("messages")
    .select("conversation_id")
    .in("conversation_id", conversationIds)
    .neq("sender_id", userId)
    .or(MESSAGES_UNREAD_FILTER);

  if (error) {
    console.warn("unread by conversation:", error.message);
    return counts;
  }
  for (const row of data ?? []) {
    const cid = (row as { conversation_id?: string }).conversation_id;
    if (!cid) continue;
    counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }
  return counts;
}

/**
 * İlan + iki kullanıcı için mevcut konuşmayı bulur (her iki yön).
 * Yoksa null — yeni satır `sender_id` = başlatan olacak şekilde eklenir.
 */
export async function findConversationForListingAndPair(
  supabase: SupabaseClient,
  listingId: string,
  aUserId: string,
  bUserId: string
): Promise<{ id: string } | null> {
  const { data: one } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("sender_id", aUserId)
    .eq("receiver_id", bUserId)
    .maybeSingle();
  if (one && typeof (one as { id?: string }).id === "string")
    return { id: (one as { id: string }).id };

  const { data: two } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("sender_id", bUserId)
    .eq("receiver_id", aUserId)
    .maybeSingle();
  if (two && typeof (two as { id?: string }).id === "string")
    return { id: (two as { id: string }).id };

  return null;
}
