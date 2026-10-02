import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ConversationsPane } from "@/components/messages/ConversationsPane";
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
import { resolveListingChatBreadcrumb } from "@/lib/listing-seo-label";
import { sanitizeUserAvatarUrl } from "@/lib/oauth-avatar";
import { buildListingSeoPath } from "@/lib/listing-seo";
import { publicAvatarUrl, resolveListingImageUrl } from "@/lib/storage";
import { fetchAdminProfilesByUserIds } from "@/lib/admin-profile";
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

  const [conv, hidden] = await Promise.all([
    fetchConversationById(supabase, conversationId, user.id),
    isConversationHiddenForUser(supabase, conversationId, user.id),
  ]);
  if (!conv) notFound();
  if (hidden) redirect("/mesajlar");

  const otherId = otherParticipantId(conv, user.id);

  const [rowsRaw, blockedSet, messages] = await Promise.all([
    fetchConversationsForUser(supabase, user.id),
    fetchBlockedPeerIds(supabase, user.id),
    fetchMessagesForConversation(supabase, conversationId),
  ]);

  let rows = rowsRaw.filter(
    (c) => !blockedSet.has(otherParticipantId(c, user.id))
  );
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

  const supportChat = isSupportConversation(conv);

  const [listingMap, profileMap, lastMap, unreadMap, adminMap, listingTrail] =
    await Promise.all([
      fetchListingSummariesByIds(supabase, listingIds),
      fetchProfilesByIds(supabase, otherIds),
      fetchLastMessagesByConversationIds(supabase, convIds),
      fetchUnreadCountsByConversation(supabase, user.id, convIds),
      fetchAdminProfilesByUserIds(supabase, otherIds),
      !supportChat && conv.listing_id
        ? supabase
            .from("listings")
            .select(
              "category_id,vehicle_brand_id,vehicle_model,vehicle_engine_package_id,vehicle_brand_model_id,description,title"
            )
            .eq("id", conv.listing_id)
            .maybeSingle()
            .then(async ({ data }) =>
              data
                ? resolveListingChatBreadcrumb(
                    supabase,
                    data as Record<string, unknown>
                  )
                : null
            )
        : Promise.resolve(null),
    ]);

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
            listingMap={Object.fromEntries(listingMap)}
            profileMap={Object.fromEntries(profileMap)}
            lastMap={Object.fromEntries(lastMap)}
            unreadMap={Object.fromEntries(unreadMap)}
            adminUserIds={[...adminMap.keys()]}
            activeConversationId={conversationId}
            className="h-full overflow-y-auto"
          />
        </div>

        <section className="flex min-h-0 flex-col overflow-hidden">
          <ChatThreadClient
            conversationId={conversationId}
            currentUserId={user.id}
            initialMessages={messages}
            listingTitle={listingTitle}
            listingHref={listingHref}
            listingImageUrl={listingImageUrl}
            listingTrail={listingTrail}
            listingActive={listingStatus.active}
            listingInactiveMessage={
              listingStatus.active ? "" : listingStatus.message
            }
            otherUserId={otherId}
            otherUserName={otherName}
            otherUserAvatarUrl={otherAvatarUrl}
            otherIsAdmin={otherIsAdmin}
            blocked={blocked}
            isSupportConversation={supportChat}
          />
        </section>
      </div>
    </div>
  );
}
