import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ConversationsPane } from "@/components/messages/ConversationsPane";
import { AdminVerifiedBadge } from "@/components/AdminVerifiedBadge";
import { fetchAdminProfilesByUserIds } from "@/lib/admin-profile";
import { tryGetSupabaseEnv } from "@/lib/env";
import { MissingEnv } from "@/components/MissingEnv";
import { ChatThreadClient } from "@/components/messages/ChatThreadClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fetchBlockedPeerIds,
  fetchConversationById,
  fetchConversationsForUser,
  fetchLastMessagesByConversationIds,
  fetchListingSummariesByIds,
  fetchMessagesForConversation,
  fetchProfilesByIds,
  fetchUnreadCountsByConversation,
  isConversationHiddenForUser,
  listingConversationStatus,
  listingSummaryForConversation,
  otherParticipantId,
  profileDisplayName,
} from "@/lib/messages";
import { sanitizeUserAvatarUrl } from "@/lib/oauth-avatar";
import { buildListingSeoPath } from "@/lib/listing-seo";
import { publicAvatarUrl, resolveListingImageUrl } from "@/lib/storage";
import {
  isSupportAgentUserId,
  isSupportConversation,
  SUPPORT_AGENT_DISPLAY_NAME,
} from "@/lib/support-agent";

type Props = { params: Promise<{ conversationId: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { conversationId } = await params;
  return {
    title: "Sohbet",
    description: `Konuşma ${conversationId.slice(0, 8)}…`,
    robots: { index: false, follow: false },
  };
}

export default async function MesajConversationPage({ params }: Props) {
  const { conversationId } = await params;
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
    redirect(
      `/giris?next=${encodeURIComponent(`/mesajlar/${conversationId}`)}`
    );
  }

  const conv = await fetchConversationById(supabase, conversationId, user.id);
  if (!conv) notFound();

  if (await isConversationHiddenForUser(supabase, conversationId, user.id)) {
    redirect("/mesajlar");
  }

  let rows = await fetchConversationsForUser(supabase, user.id);
  const otherId = otherParticipantId(conv, user.id);
  const blockedSet = await fetchBlockedPeerIds(supabase, user.id);
  rows = rows.filter((c) => !blockedSet.has(otherParticipantId(c, user.id)));
  const blocked = blockedSet.has(otherId);

  // Açık sohbet henüz mesajsız olabilir (listeden elenir) — ilan/profil yine çekilmeli.
  const convIds = [...new Set([conversationId, ...rows.map((c) => c.id)])];
  const listingIds = [
    ...new Set(
      [conv.listing_id, ...rows.map((c) => c.listing_id)].filter(
        (id): id is string => Boolean(id)
      )
    ),
  ];
  const otherIds = [
    ...new Set(
      [otherId, ...rows.map((c) => otherParticipantId(c, user.id))].filter(
        Boolean
      )
    ),
  ];

  const [messages, listingMap, profileMap, lastMap, unreadMap, adminMap] = await Promise.all([
    fetchMessagesForConversation(supabase, conversationId),
    fetchListingSummariesByIds(supabase, listingIds),
    fetchProfilesByIds(supabase, otherIds),
    fetchLastMessagesByConversationIds(supabase, convIds),
    fetchUnreadCountsByConversation(supabase, user.id, convIds),
    fetchAdminProfilesByUserIds(supabase, otherIds),
  ]);

  const supportChat = isSupportConversation(conv);
  const listing = listingSummaryForConversation(listingMap, conv.listing_id);
  const listingTitle = supportChat
    ? SUPPORT_AGENT_DISPLAY_NAME
    : listing?.title?.trim() || null;
  const num = listing?.listing_number;
  const listingHref = supportChat
    ? null
    : buildListingSeoPath(
        num != null ? String(num) : null,
        listingTitle
      );
  const listingImageUrl = supportChat
    ? null
    : resolveListingImageUrl(env, listing?.image_url ?? null);
  const listingStatus = supportChat
    ? ({ active: true } as const)
    : listingConversationStatus(listing);
  const otherProfile = profileMap.get(otherId) ?? null;
  const otherIsAdmin = adminMap.has(otherId) || isSupportAgentUserId(otherId);
  const otherName = isSupportAgentUserId(otherId)
    ? SUPPORT_AGENT_DISPLAY_NAME
    : profileDisplayName(otherProfile);
  const otherAvatarRaw =
    sanitizeUserAvatarUrl(
      otherProfile?.avatar_url != null ? String(otherProfile.avatar_url).trim() : null
    ) ?? "";
  const otherAvatarUrl = otherAvatarRaw
    ? /^https?:\/\//i.test(otherAvatarRaw)
      ? otherAvatarRaw
      : publicAvatarUrl(env, otherAvatarRaw.replace(/^\/+/, ""))
    : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-2 pt-2 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:px-6 md:pb-4 md:pt-3">
      <div className="mb-2 shrink-0 md:hidden">
        <Link
          href="/mesajlar"
          className="inline-flex items-center text-sm font-medium text-emerald-800 hover:underline"
        >
          ← Sohbet listesi
        </Link>
      </div>
      <div
        className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[280px_minmax(0,1fr)] md:!h-[calc(100dvh-4.5rem)] md:!max-h-[calc(100dvh-4.5rem)]"
        style={{
          // Header (~3.75rem) + mobil alt menü (~4.75rem); desktop’ta footer mesajlarda gizli
          height:
            "calc(100dvh - 3.75rem - 4.75rem - env(safe-area-inset-bottom, 0px))",
          maxHeight:
            "calc(100dvh - 3.75rem - 4.75rem - env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="hidden min-h-0 md:block">
          <ConversationsPane
            env={env}
            rows={rows}
            userId={user.id}
            listingMap={listingMap}
            profileMap={profileMap}
            lastMap={lastMap}
            unreadMap={unreadMap}
            adminUserIds={new Set(adminMap.keys())}
            activeConversationId={conversationId}
            className="h-full overflow-y-auto"
          />
        </div>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
          <div className="mb-2 shrink-0 border-b border-zinc-200 pb-2">
            <Link
              href={`/kullanici/${otherId}`}
              className="flex items-center gap-2 rounded-lg px-0.5 py-0.5 transition-colors hover:bg-zinc-50"
            >
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-200">
                {otherAvatarUrl ? (
                  <Image
                    src={otherAvatarUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-600">
                    {otherName.trim().slice(0, 1).toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <h1 className="truncate text-sm font-semibold tracking-tight text-zinc-900 sm:text-base">
                    {otherName}
                  </h1>
                  {otherIsAdmin ? (
                    <AdminVerifiedBadge className="shrink-0" size={16} />
                  ) : null}
                </div>
                <p className="text-[11px] text-zinc-500">
                  {supportChat ? "Destek sohbeti" : "İlan üzerinden sohbet"}
                </p>
              </div>
            </Link>
          </div>
          <ChatThreadClient
            conversationId={conversationId}
            currentUserId={user.id}
            initialMessages={messages}
            listingTitle={listingTitle}
            listingHref={listingHref}
            listingImageUrl={listingImageUrl}
            listingActive={listingStatus.active}
            listingInactiveMessage={
              listingStatus.active ? "" : listingStatus.message
            }
            otherUserName={otherName}
            otherUserAvatarUrl={otherAvatarUrl}
            blocked={blocked}
            isSupportConversation={supportChat}
          />
        </section>
      </div>
    </div>
  );
}
