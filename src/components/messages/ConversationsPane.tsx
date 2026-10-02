"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { SupabasePublicEnv } from "@/lib/env";
import { AdminVerifiedBadge } from "@/components/AdminVerifiedBadge";
import {
  deleteOwnConversationForMe,
  listingConversationStatus,
  listingSummaryForConversation,
  otherParticipantId,
  profileDisplayName,
  type ConversationRow,
  type ListingMessageSummary,
  type ProfileMessageSummary,
} from "@/lib/messages";
import {
  isSupportAgentUserId,
  SUPPORT_AGENT_DISPLAY_NAME,
} from "@/lib/support-agent";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { dispatchUnreadMessagesRefresh } from "@/lib/unread-messages-events";
import { resolveListingImageUrl } from "@/lib/storage";

const DELETE_REVEAL_PX = 88;
const DELETE_COMMIT_PX = 72;

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

function ConversationSwipeRow({
  href,
  active,
  dimmed,
  onDeleted,
  children,
}: {
  href: string;
  active: boolean;
  dimmed: boolean;
  onDeleted: () => Promise<void>;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const offsetRef = useRef(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const axis = useRef<"none" | "x" | "y">("none");
  const dragging = useRef(false);
  const didSwipe = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

  const setOffsetBoth = useCallback((v: number) => {
    offsetRef.current = v;
    setOffset(v);
  }, []);

  const reset = useCallback(() => setOffsetBoth(0), [setOffsetBoth]);

  const askAndDelete = useCallback(async () => {
    if (busy) return;
    const ok = window.confirm(
      "Bu sohbeti listenizden silmek istiyor musunuz?\n\nSadece sizden kalkar; karşı taraf görmeye devam eder."
    );
    if (!ok) {
      reset();
      return;
    }
    setBusy(true);
    try {
      await onDeleted();
    } finally {
      setBusy(false);
      reset();
    }
  }, [busy, onDeleted, reset]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (busy || e.button !== 0) return;
    dragging.current = true;
    didSwipe.current = false;
    axis.current = "none";
    pointerIdRef.current = e.pointerId;
    startX.current = e.clientX;
    startY.current = e.clientY;
    startOffset.current = offsetRef.current;
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (axis.current === "none") {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      axis.current = Math.abs(dx) > Math.abs(dy) * 1.15 ? "x" : "y";
      if (axis.current === "x" && pointerIdRef.current != null) {
        try {
          e.currentTarget.setPointerCapture(pointerIdRef.current);
        } catch {
          /* ignore */
        }
      }
    }
    if (axis.current !== "x") return;
    e.preventDefault();
    didSwipe.current = true;
    const next = Math.min(
      0,
      Math.max(-DELETE_REVEAL_PX, startOffset.current + dx)
    );
    setOffsetBoth(next);
  };

  const finishPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (pointerIdRef.current != null) {
      try {
        e.currentTarget.releasePointerCapture(pointerIdRef.current);
      } catch {
        /* ignore */
      }
      pointerIdRef.current = null;
    }
    const cur = offsetRef.current;
    if (axis.current === "x" && cur <= -DELETE_COMMIT_PX) {
      void askAndDelete();
      return;
    }
    if (axis.current === "x" && cur < -28) {
      setOffsetBoth(-DELETE_REVEAL_PX);
      return;
    }
    reset();
  };

  const openChat = () => {
    if (didSwipe.current || offsetRef.current < -8 || busy) {
      if (offsetRef.current < -8) reset();
      return;
    }
    router.push(href);
  };

  const revealed = offset < -2;

  return (
    <div className="relative overflow-hidden border-b border-zinc-100 last:border-0">
      {/* Sadece sola çekilince görünsün */}
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 flex w-[88px] items-center justify-center bg-red-500 transition-opacity ${
          revealed ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      >
        <div className="flex flex-col items-center justify-center gap-0.5 text-xs font-semibold text-white">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Sil
        </div>
      </div>
      {revealed ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void askAndDelete()}
          className="absolute inset-y-0 right-0 z-[1] w-[88px] bg-transparent"
          aria-label="Sohbeti sil"
        />
      ) : null}
      <div
        role="link"
        tabIndex={0}
        className={`relative z-[2] select-none touch-pan-y ${
          active ? "bg-[#fffbf0]" : "bg-white"
        }`}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging.current ? "none" : "transform 160ms ease-out",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onClick={openChat}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openChat();
          }
        }}
      >
        <div
          className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50/80 active:bg-zinc-100 ${
            dimmed ? "opacity-60" : ""
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function ConversationsPane({
  env,
  rows,
  userId,
  listingMap,
  profileMap,
  lastMap,
  unreadMap,
  adminUserIds = [],
  activeConversationId = null,
  className = "",
}: {
  env: SupabasePublicEnv;
  rows: ConversationRow[];
  userId: string;
  listingMap: Record<string, ListingMessageSummary>;
  profileMap: Record<string, ProfileMessageSummary>;
  lastMap: Record<
    string,
    { content: string; created_at: string | null; sender_id: string }
  >;
  unreadMap: Record<string, number>;
  adminUserIds?: string[];
  activeConversationId?: string | null;
  className?: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const adminSet = useMemo(() => new Set(adminUserIds), [adminUserIds]);

  const listingLookup = useMemo(() => {
    const m = new Map<string, ListingMessageSummary>();
    for (const [k, v] of Object.entries(listingMap)) m.set(k, v);
    return m;
  }, [listingMap]);

  const visibleRows = useMemo(
    () => rows.filter((c) => !hiddenIds.has(c.id)),
    [rows, hiddenIds]
  );

  const handleDelete = useCallback(
    async (conversationId: string) => {
      const ok = await deleteOwnConversationForMe(
        supabase,
        conversationId,
        userId
      );
      if (!ok) {
        window.alert("Sohbet silinemedi. Tekrar deneyin.");
        return;
      }
      setHiddenIds((prev) => new Set(prev).add(conversationId));
      dispatchUnreadMessagesRefresh();
      if (activeConversationId === conversationId) {
        router.push("/mesajlar");
      }
      router.refresh();
    },
    [activeConversationId, router, supabase, userId]
  );

  if (visibleRows.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 text-center ${className}`}
      >
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
          <svg
            className="h-8 w-8 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
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
        {visibleRows.map((c) => {
          const listing = listingSummaryForConversation(
            listingLookup,
            c.listing_id
          );
          const otherProfile = profileMap[otherParticipantId(c, userId)];
          const last = lastMap[c.id];
          const unread = unreadMap[c.id] ?? 0;
          const otherId = otherParticipantId(c, userId);
          const isSupportChat =
            isSupportAgentUserId(otherId) || isSupportAgentUserId(userId);
          const title = isSupportChat
            ? "Destek"
            : listing?.title?.trim() || "İlan";
          const imgSrc = resolveListingImageUrl(env, listing?.image_url ?? null);
          const listingStatus = isSupportChat
            ? ({ active: true } as const)
            : listingConversationStatus(listing);
          const otherName = isSupportAgentUserId(otherId)
            ? SUPPORT_AGENT_DISPLAY_NAME
            : profileDisplayName(otherProfile ?? null);
          const isAdminUser =
            adminSet.has(otherId) || isSupportAgentUserId(otherId);
          const active = activeConversationId === c.id;
          const timeStr = formatTime(last?.created_at ?? null);

          return (
            <ConversationSwipeRow
              key={c.id}
              href={`/mesajlar/${c.id}`}
              active={active}
              dimmed={!listingStatus.active}
              onDeleted={() => handleDelete(c.id)}
            >
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
                <p className="truncate text-[11px] text-zinc-500">
                  {title}
                  {!listingStatus.active ? (
                    <span className="ml-1 font-medium text-zinc-400">
                      · İlan kapalı
                    </span>
                  ) : null}
                </p>
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
            </ConversationSwipeRow>
          );
        })}
      </div>
    </div>
  );
}
