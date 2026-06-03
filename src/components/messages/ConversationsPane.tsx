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
  const prefix = last.sender_id === userId ? "Sen: " : "";
  const t = last.content.trim();
  return prefix + (t.length > 60 ? `${t.slice(0, 57)}…` : t);
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "Şimdi";
  if (diffMins < 60) return `${diffMins}dk`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}s`;
  if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}g`;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
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
        className={`flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 text-center ${className}`}
      >
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
          <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-900">Henüz mesajınız yok</p>
        <p className="mt-1 text-xs text-zinc-500">
          İlan sayfalarından satıcılara mesaj gönderin
        </p>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ${className}`}
    >
      <div className="overflow-y-auto">
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
          const timeStr = formatTime(last?.created_at ?? null);
          
          return (
            <Link
              key={c.id}
              href={`/mesajlar/${c.id}`}
              className={`flex items-center gap-3 border-b border-zinc-100 px-4 py-3 transition-colors last:border-0 hover:bg-zinc-50 active:bg-zinc-100 ${
                active ? "bg-[#fffbf0]" : ""
              }`}
            >
              {/* Avatar & Listing Image */}
              <div className="relative shrink-0">
                <div className="relative h-12 w-12 overflow-hidden rounded-full bg-zinc-100 ring-2 ring-white">
                  {imgSrc ? (
                    <Image
                      src={imgSrc}
                      alt=""
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-400">
                      {otherName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                {unread > 0 ? (
                  <div className="absolute -bottom-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#ffc400] px-1.5 text-[10px] font-bold text-black shadow-sm">
                    {unread > 99 ? "99" : unread}
                  </div>
                ) : null}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {otherName}
                    </p>
                    {isAdminUser ? <AdminVerifiedBadge size={12} /> : null}
                  </div>
                  {timeStr ? (
                    <span className="shrink-0 text-[11px] text-zinc-400">
                      {timeStr}
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-[11px] text-zinc-500">{title}</p>
                <p
                  className={`mt-0.5 truncate text-[13px] ${
                    unread > 0
                      ? "font-medium text-zinc-900"
                      : "text-zinc-500"
                  }`}
                >
                  {previewText(last, userId)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
