import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChatThreadClient } from "@/components/messages/ChatThreadClient";
import {
  isSupportAgentUserId,
  SUPPORT_AGENT_DISPLAY_NAME,
} from "@/lib/support-agent";
import {
  fetchSupportMessages,
  findOrCreateSupportConversation,
} from "@/lib/support-chat-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Destek",
  robots: { index: false, follow: false },
};

export default async function ProfilDestekPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Destek hesabı mesajları kendi Mesajlar kutusundan yönetir
  if (isSupportAgentUserId(user.id)) {
    redirect("/mesajlar");
  }

  let conversation = null;
  try {
    conversation = await findOrCreateSupportConversation(user.id);
  } catch (error) {
    console.error("findOrCreateSupportConversation:", error);
  }

  if (!conversation) {
    return (
      <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Destek sohbeti açılamadı. Lütfen daha sonra tekrar deneyin.
      </div>
    );
  }

  const messages = await fetchSupportMessages(conversation.id);

  return (
    <div className="mx-auto mt-8 w-full max-w-2xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Destek</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Mesajlarınız uygulama içi mesajlaşmaya gider. Yanıtlar burada ve{" "}
            <Link href="/mesajlar" className="font-semibold underline">
              Mesajlar
            </Link>{" "}
            kutusunda görünür.
          </p>
        </div>
        <Link
          href={`/mesajlar/${conversation.id}`}
          className="text-xs font-semibold text-zinc-700 underline"
        >
          Mesajlarda aç
        </Link>
      </div>

      <div className="min-h-[28rem] rounded-xl border border-zinc-200 bg-white p-4">
        <ChatThreadClient
          conversationId={conversation.id}
          currentUserId={user.id}
          initialMessages={messages}
          listingTitle={SUPPORT_AGENT_DISPLAY_NAME}
          listingHref={null}
          listingImageUrl={null}
          listingActive
          listingInactiveMessage=""
          otherUserName={SUPPORT_AGENT_DISPLAY_NAME}
          otherUserAvatarUrl={null}
          blocked={false}
        />
      </div>
    </div>
  );
}
