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
  otherParticipantId,
  profileDisplayName,
} from "@/lib/messages";
import { sanitizeUserAvatarUrl } from "@/lib/oauth-avatar";
import { publicAvatarUrl } from "@/lib/storage";

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

  let rows = await fetchConversationsForUser(supabase, user.id);
  const otherId = otherParticipantId(conv, user.id);
  const blockedSet = await fetchBlockedPeerIds(supabase, user.id);
  rows = rows.filter((c) => !blockedSet.has(otherParticipantId(c, user.id)));
  const blocked = blockedSet.has(otherId);

  const convIds = rows.map((c) => c.id);
  const listingIds = [...new Set(rows.map((c) => c.listing_id))];
  const otherIds = [...new Set(rows.map((c) => otherParticipantId(c, user.id)))];

  const [messages, listingMap, profileMap, lastMap, unreadMap, adminMap] = await Promise.all([
    fetchMessagesForConversation(supabase, conversationId),
    fetchListingSummariesByIds(supabase, listingIds),
    fetchProfilesByIds(supabase, otherIds),
    fetchLastMessagesByConversationIds(supabase, convIds),
    fetchUnreadCountsByConversation(supabase, user.id, convIds),
    fetchAdminProfilesByUserIds(supabase, otherIds),
  ]);

  const listing = listingMap.get(conv.listing_id);
  const listingTitle = listing?.title?.trim() || null;
  const num = listing?.listing_number;
  const listingHref =
    num !== null && num !== undefined
      ? `/ilan/${encodeURIComponent(String(num))}`
      : null;
  const otherProfile = profileMap.get(otherId) ?? null;
  const otherIsAdmin = adminMap.has(otherId);
  const otherName = profileDisplayName(otherProfile);
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
    <div className="mx-auto w-full max-w-6xl flex-1 px-2 py-6 sm:px-4 md:px-6 md:py-8">
      <div className="mb-3 md:hidden">
        <Link href="/mesajlar" className="text-sm font-medium text-emerald-800 hover:underline">
          ← Sohbet listesi
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[300px_minmax(0,1fr)]">
        <div className="hidden md:block">
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
            className="max-h-[82vh] overflow-y-auto"
          />
        </div>

        <section className="flex h-[82vh] min-h-0 flex-col rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
          <div className="mb-4 border-b border-zinc-200 pb-3">
            <Link
              href={`/kullanici/${otherId}`}
              className="flex items-center gap-2.5 rounded-lg px-1 py-0.5 transition-colors hover:bg-zinc-50"
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
                  <h1 className="truncate text-base font-semibold tracking-tight text-zinc-900 sm:text-lg">
                    {otherName}
                  </h1>
                  {otherIsAdmin ? (
                    <AdminVerifiedBadge className="shrink-0" size={16} />
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-zinc-600">İlan üzerinden sohbet</p>
              </div>
            </Link>
          </div>
          <ChatThreadClient
            conversationId={conversationId}
            currentUserId={user.id}
            initialMessages={messages}
            listingTitle={listingTitle}
            listingHref={listingHref}
            otherUserName={otherName}
            otherUserAvatarUrl={otherAvatarUrl}
            blocked={blocked}
          />
        </section>
      </div>
    </div>
  );
}
