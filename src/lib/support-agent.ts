/** Uygulama içi destek mesajlarının gittiği / cevapların geldiği hesap. */
export const DEFAULT_SUPPORT_AGENT_USER_ID =
  "1f244457-3a09-41ae-85ca-0e354fc85505";

export const SUPPORT_AGENT_DISPLAY_NAME = "Oto Pazarı Destek";

export function getSupportAgentUserId(): string {
  return (
    process.env.SUPPORT_AGENT_USER_ID?.trim() ||
    process.env.NEXT_PUBLIC_SUPPORT_AGENT_USER_ID?.trim() ||
    DEFAULT_SUPPORT_AGENT_USER_ID
  );
}

export function isSupportAgentUserId(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return userId === getSupportAgentUserId();
}

/** Destek sohbeti: taraflardan biri destek hesabı (skeklik098 / sabit id). */
export function isSupportConversation(conversation: {
  sender_id: string;
  receiver_id: string;
}): boolean {
  return (
    isSupportAgentUserId(conversation.sender_id) ||
    isSupportAgentUserId(conversation.receiver_id)
  );
}
