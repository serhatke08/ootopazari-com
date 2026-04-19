import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ConversationsPane } from "@/components/messages/ConversationsPane";
import { fetchAdminProfilesByUserIds } from "@/lib/admin-profile";
import { tryGetSupabaseEnv } from "@/lib/env";
import { MissingEnv } from "@/components/MissingEnv";
import {
  fetchBlockedPeerIds,
  fetchConversationsForUser,
  fetchLastMessagesByConversationIds,
  fetchListingSummariesByIds,
  fetchProfilesByIds,
  fetchUnreadCountsByConversation,
  otherParticipantId,
} from "@/lib/messages";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Mesajlar",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MesajlarPage() {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/giris?next=${encodeURIComponent("/mesajlar")}`);
  }

  const userId = user.id;
  let rows = await fetchConversationsForUser(supabase, userId);
  const blocked = await fetchBlockedPeerIds(supabase, userId);
  rows = rows.filter((c) => !blocked.has(otherParticipantId(c, userId)));

  const convIds = rows.map((c) => c.id);
  const listingIds = [...new Set(rows.map((c) => c.listing_id))];
  const otherIds = [...new Set(rows.map((c) => otherParticipantId(c, userId)))];

  const [listingMap, profileMap, lastMap, unreadMap, adminMap] = await Promise.all([
    fetchListingSummariesByIds(supabase, listingIds),
    fetchProfilesByIds(supabase, otherIds),
    fetchLastMessagesByConversationIds(supabase, convIds),
    fetchUnreadCountsByConversation(supabase, userId, convIds),
    fetchAdminProfilesByUserIds(supabase, otherIds),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-2 py-6 sm:px-4 md:px-6 md:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Mesajlar
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Soldan bir konuşma seçerek sağ tarafta sohbeti açabilirsiniz.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[300px_minmax(0,1fr)]">
        <ConversationsPane
          env={env}
          rows={rows}
          userId={userId}
          listingMap={listingMap}
          profileMap={profileMap}
          lastMap={lastMap}
          unreadMap={unreadMap}
          adminUserIds={new Set(adminMap.keys())}
          className="max-h-[82vh] overflow-y-auto"
        />
        <section className="hidden min-h-[82vh] items-center justify-center rounded-xl border border-zinc-200 bg-white p-8 md:flex">
          <div className="max-w-sm text-center">
            <h2 className="text-lg font-semibold text-zinc-900">
              Bir sohbet seçin
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Sol taraftan konuşma seçtiğinizde mesajlar sağ panelde açılır.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
