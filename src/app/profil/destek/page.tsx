import type { Metadata } from "next";
import { SupportChatClient } from "@/components/SupportChatClient";
import { fetchAdminProfileByUserId } from "@/lib/admin-profile";
import {
  fetchAllSupportThreadsForAdmin,
  fetchSupportMessages,
  getOrCreateSupportThread,
} from "@/lib/support-chat";
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

  const adminProfile = await fetchAdminProfileByUserId(supabase, user.id);
  const isAdmin = !!adminProfile;

  if (isAdmin) {
    const adminThreads = await fetchAllSupportThreadsForAdmin(supabase);
    const activeThreadId = adminThreads[0]?.id ?? "";
    const messages = activeThreadId
      ? await fetchSupportMessages(supabase, activeThreadId)
      : [];

    return (
      <div className="mx-auto mt-8 w-full max-w-4xl">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Destek</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Kullanıcı destek mesajlarını yanıtlayın.
          </p>
        </div>
        {adminThreads.length === 0 ? (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
            Henüz kullanıcı destek mesajı yok.
          </div>
        ) : (
          <div className="mt-6">
            <SupportChatClient
              currentUserId={user.id}
              isAdmin
              initialThreadId={activeThreadId}
              initialMessages={messages}
              adminThreads={adminThreads}
            />
          </div>
        )}
      </div>
    );
  }

  const thread = await getOrCreateSupportThread(supabase, user.id);
  if (!thread) {
    return (
      <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Destek sohbeti başlatılamadı. Lütfen daha sonra tekrar deneyin.
      </div>
    );
  }

  const messages = await fetchSupportMessages(supabase, thread.id);

  return (
    <div className="mx-auto mt-8 w-full max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Destek</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Sorun, ödeme veya hesap taleplerinizi buradan destek ekibine iletebilirsiniz.
          Yanıtlar aynı sohbette görünür.
        </p>
      </div>
      <div className="mt-6">
        <SupportChatClient
          currentUserId={user.id}
          isAdmin={false}
          initialThreadId={thread.id}
          initialMessages={messages}
        />
      </div>
    </div>
  );
}
