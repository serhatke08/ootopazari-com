import type { SupabaseClient } from "@supabase/supabase-js";

export type UserNotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  listing_id: string | null;
  conversation_id?: string | null;
  read_at: string | null;
  created_at: string;
};

export async function fetchUserNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<UserNotificationRow[]> {
  const { data, error } = await supabase
    .from("user_notifications")
    .select(
      "id,user_id,type,title,body,listing_id,conversation_id,read_at,created_at"
    )
    .or(`user_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.message) {
      console.warn("user_notifications:", error.message);
    }
    return [];
  }
  return (data ?? []) as UserNotificationRow[];
}

export async function countUnreadNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("user_notifications")
    .select("*", { count: "exact", head: true })
    .or(`user_id.eq.${userId},recipient_id.eq.${userId}`)
    .is("read_at", null);

  if (error) {
    if (error.message) {
      console.warn("user_notifications count:", error.message);
    }
    return 0;
  }
  return count ?? 0;
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  userId: string,
  notificationId: string
): Promise<boolean> {
  const mine = `user_id.eq.${userId},recipient_id.eq.${userId}`;
  const { error } = await supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .or(mine);

  return !error;
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const mine = `user_id.eq.${userId},recipient_id.eq.${userId}`;
  const { error } = await supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .or(mine)
    .is("read_at", null);

  return !error;
}
