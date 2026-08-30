/** Supabase / Postgres mesajlaşma hatalarını kullanıcı diline çevirir. */
export function mapMessagingError(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("listing_not_active_for_messaging")) {
    return "Bu ilan artık mesajlaşmaya kapalı. Yeni mesaj gönderilemez.";
  }
  if (m.includes("row-level security") || m.includes("permission denied")) {
    return "Mesaj gönderme izniniz yok. Oturumu kapatıp tekrar giriş yapmayı deneyin.";
  }
  if (m.includes("not_authenticated") || m.includes("jwt")) {
    return "Oturum süresi dolmuş olabilir. Tekrar giriş yapın.";
  }
  return message?.trim() || "Mesaj gönderilemedi.";
}
