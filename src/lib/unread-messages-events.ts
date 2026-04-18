/** Okunmamış mesaj sayısı hook’unu anında yenilemek için (ör. sohbette okundu işaretlendi). */
export const UNREAD_MESSAGES_REFRESH_EVENT = "otomobil:unread-messages-refresh";

export function dispatchUnreadMessagesRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(UNREAD_MESSAGES_REFRESH_EVENT));
}
