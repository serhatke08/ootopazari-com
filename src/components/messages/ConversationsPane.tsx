import Image from "next/image";
import Link from "next/link";
import type { SupabasePublicEnv } from "@/lib/env";
import { AdminVerifiedBadge } from "@/components/AdminVerifiedBadge";
import {
  otherParticipantId,
  profileDisplayName,
  type ConversationRow,
  type ListingMessageSummary,
  type ProfileMessageSummary,
} from "@/lib/messages";
import { resolveListingImageUrl } from "@/lib/storage";

function previewText(
  last: { content: string; sender_id: string } | undefined,
  userId: string
): string {
  if (!last) return "Henüz mesaj yok";
  const prefix = last.sender_id === userId ? "Siz: " : "";
  const t = last.content.trim();
  return prefix + (t.length > 120 ? `${t.slice(0, 117)}…` : t);
}

export function ConversationsPane({
  env,
  rows,
  userId,
  listingMap,
  profileMap,
  lastMap,
  unreadMap,
  adminUserIds = new Set<string>(),
  activeConversationId = null,
  className = "",
}: {
  env: SupabasePublicEnv;
  rows: ConversationRow[];
  userId: string;
  listingMap: Map<string, ListingMessageSummary>;
  profileMap: Map<string, ProfileMessageSummary>;
  lastMap: Map<
    string,
    { content: string; created_at: string | null; sender_id: string }
  >;
  unreadMap: Map<string, number>;
  adminUserIds?: Set<string>;
  activeConversationId?: string | null;
  className?: string;
}) {
  if (rows.length === 0) {
    return (
      <div
        className={`rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 ${className}`}
      >
        Henüz bir konuşmanız yok. Bir ilan sayfasından "Mesaj gönder" ile
        satıcıya yazabilirsiniz.
      </div>
    );
  }

  return (
    <ul
      className={`space-y-2 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-2 shadow-sm ${className}`}
    >
      {rows.map((c) => {
        const listing = listingMap.get(c.listing_id);
        const otherProfile = profileMap.get(otherParticipantId(c, userId));
        const last = lastMap.get(c.id);
        const unread = unreadMap.get(c.id) ?? 0;
        const otherId = otherParticipantId(c, userId);
        const title = listing?.title?.trim() || "İlan";
        const imgSrc = resolveListingImageUrl(env, listing?.image_url ?? null);
        const otherName = profileDisplayName(otherProfile ?? null);
        const isAdminUser = adminUserIds.has(otherId);
        const active = activeConversationId === c.id;
        return (
          <li key={c.id}>
            <Link
              href={`/mesajlar/${c.id}`}
              className={`flex gap-3 rounded-xl border px-3 py-3 transition-colors sm:gap-4 sm:px-4 ${
                active
                  ? "border-amber-400 bg-amber-50/80 ring-1 ring-amber-300/60"
                  : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                {imgSrc ? (
                  <Image
                    src={imgSrc}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-400">
                    İlan
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {otherName}
                    </p>
                    {isAdminUser ? <AdminVerifiedBadge size={14} /> : null}
                  </div>
                  {unread > 0 ? (
                    <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-xs text-zinc-500">{title}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {previewText(last, userId)}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
