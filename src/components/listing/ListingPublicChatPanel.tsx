"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ListingPublicCommentView } from "@/lib/listing-public-comments";
import { enrichListingPublicComment } from "@/lib/listing-public-comments";
import { getClientAuthUser } from "@/lib/supabase/auth-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  listingId: string;
  listingPath: string;
  sellerUserId: string;
  initialComments: ListingPublicCommentView[];
  viewerId: string | null;
  viewerName: string | null;
  viewerAvatarUrl: string | null;
  canPost: boolean;
};

function fmtTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function ChatAvatar({
  url,
  name,
  variant,
}: {
  url: string | null;
  name: string;
  variant: "seller" | "self" | "other";
}) {
  const ring =
    variant === "seller"
      ? "ring-2 ring-emerald-500/40"
      : variant === "self"
        ? "ring-2 ring-emerald-600/25"
        : "ring-1 ring-black/10";

  if (url) {
    return (
      <div
        className={`relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-100 ${ring}`}
      >
        <Image
          src={url}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 object-cover"
        />
      </div>
    );
  }

  const bg =
    variant === "seller"
      ? "bg-emerald-600 text-white"
      : variant === "self"
        ? "bg-emerald-700 text-white"
        : "bg-zinc-200 text-zinc-600";

  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${bg} ${ring}`}
      aria-hidden
    >
      {name.trim().slice(0, 1).toUpperCase() || "?"}
    </div>
  );
}

function MessageBubble({
  comment,
  viewerId,
}: {
  comment: ListingPublicCommentView;
  viewerId: string | null;
}) {
  const isSeller = comment.isSeller;
  const isSelf = viewerId != null && comment.user_id === viewerId;

  if (isSelf && !isSeller) {
    return (
      <li className="flex justify-end">
        <div className="flex max-w-[88%] flex-col items-end gap-1">
          <div className="rounded-2xl rounded-br-md bg-emerald-700 px-3.5 py-2.5 text-sm leading-relaxed text-white shadow-sm">
            <p className="whitespace-pre-wrap break-words">{comment.body}</p>
          </div>
          <time
            className="pr-1 text-[10px] text-black/40"
            dateTime={comment.created_at}
          >
            {fmtTime(comment.created_at)} · Siz
          </time>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-end gap-2">
      <ChatAvatar
        url={comment.authorAvatarUrl}
        name={comment.authorName}
        variant={isSeller ? "seller" : "other"}
      />
      <div className="min-w-0 max-w-[88%]">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span
            className={`text-xs font-semibold ${
              isSeller ? "text-emerald-800" : "text-black/80"
            }`}
          >
            {comment.authorName}
          </span>
          {isSeller ? (
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
              Satıcı
            </span>
          ) : null}
        </div>
        <div
          className={`rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
            isSeller
              ? "border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white text-emerald-950"
              : "border border-black/8 bg-white text-black/90"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{comment.body}</p>
        </div>
        <time
          className="mt-1 block pl-0.5 text-[10px] text-black/40"
          dateTime={comment.created_at}
        >
          {fmtTime(comment.created_at)}
        </time>
      </div>
    </li>
  );
}

export function ListingPublicChatPanel({
  listingId,
  listingPath,
  sellerUserId,
  initialComments,
  viewerId,
  viewerName,
  viewerAvatarUrl,
  canPost,
}: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [comments, setComments] =
    useState<ListingPublicCommentView[]>(initialComments);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [comments, scrollToBottom]);

  useEffect(() => {
    const channel = supabase
      .channel(`listing-public-comments:${listingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "listing_public_comments",
          filter: `listing_id=eq.${listingId}`,
        },
        (payload) => {
          const row = payload.new as ListingPublicCommentView;
          void enrichListingPublicComment(
            supabase,
            {
              id: row.id,
              listing_id: row.listing_id,
              user_id: row.user_id,
              body: row.body,
              created_at: row.created_at,
            },
            sellerUserId
          ).then((enriched) => {
            setComments((prev) => {
              if (prev.some((c) => c.id === enriched.id)) return prev;
              return [...prev, enriched];
            });
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [listingId, sellerUserId, supabase]);

  async function submitMessage() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSendError(null);
    setSending(true);
    try {
      const user = await getClientAuthUser(supabase);
      if (!user) {
        window.location.href = `/giris?next=${encodeURIComponent(listingPath)}`;
        return;
      }

      const { data, error } = await supabase
        .from("listing_public_comments")
        .insert({
          listing_id: listingId,
          user_id: user.id,
          body: trimmed,
        })
        .select("id,listing_id,user_id,body,created_at")
        .single();

      if (error) {
        setSendError(error.message || "Gönderilemedi.");
        return;
      }

      const row = data as ListingPublicCommentView;
      const local: ListingPublicCommentView = {
        id: row.id,
        listing_id: row.listing_id,
        user_id: row.user_id,
        body: row.body,
        created_at: row.created_at ?? new Date().toISOString(),
        authorName: viewerName ?? "Siz",
        authorAvatarUrl: viewerAvatarUrl,
        isSeller: row.user_id === sellerUserId,
      };

      setComments((prev) => {
        if (prev.some((c) => c.id === local.id)) return prev;
        return [...prev, local];
      });
      setText("");

      void enrichListingPublicComment(
        supabase,
        {
          id: local.id,
          listing_id: local.listing_id,
          user_id: local.user_id,
          body: local.body,
          created_at: local.created_at,
        },
        sellerUserId
      ).then((enriched) => {
        setComments((prev) =>
          prev.map((c) => (c.id === enriched.id ? enriched : c))
        );
      });
    } finally {
      setSending(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    await submitMessage();
  }

  const countLabel =
    comments.length === 0
      ? "Henüz mesaj yok"
      : `${comments.length} mesaj`;

  return (
    <section
      className="listing-public-chat mt-4 hidden min-[80rem]:flex min-[80rem]:flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
      aria-label="İlan sohbeti"
    >
      <header className="relative border-b border-emerald-900/10 bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-600 px-4 py-3.5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight">
                Soru &amp; Yorum
              </h2>
              <p className="mt-0.5 text-xs leading-snug text-emerald-50/90">
                Bu ilana özel herkese açık sohbet — fiyat, durum veya detay
                sorabilirsiniz.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm">
            {countLabel}
          </span>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex min-h-[18rem] max-h-[28rem] flex-1 flex-col overflow-y-auto bg-[linear-gradient(180deg,#f8faf9_0%,#f4f4f5_100%)] px-3 py-4 scroll-smooth"
      >
        {comments.length === 0 ? (
          <div className="m-auto flex max-w-[14rem] flex-col items-center px-4 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/8">
              <svg
                className="h-7 w-7 text-emerald-700/50"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3h12m-9 3h6m-6 3h3m-3-9V6.75A2.25 2.25 0 0 1 9.75 4.5h4.5A2.25 2.25 0 0 1 16.5 6.75v1.5M4.5 9.75v7.5A2.25 2.25 0 0 0 6.75 19.5h10.5A2.25 2.25 0 0 0 19.5 17.25v-7.5"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-black/55">
              Sohbet henüz başlamadı
            </p>
            <p className="mt-1 text-xs leading-relaxed text-black/40">
              İlk soruyu veya yorumu siz yazın; satıcı ve diğer ziyaretçiler
              görebilir.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {comments.map((c) => (
              <MessageBubble key={c.id} comment={c} viewerId={viewerId} />
            ))}
          </ul>
        )}
      </div>

      <footer className="border-t border-black/8 bg-white p-3.5">
        {canPost ? (
          viewerId ? (
            <form onSubmit={send}>
              <div className="flex items-end gap-2.5">
                <ChatAvatar
                  url={viewerAvatarUrl}
                  name={viewerName ?? "?"}
                  variant="self"
                />
                <div className="min-w-0 flex-1">
                  <div className="overflow-hidden rounded-xl border border-black/12 bg-zinc-50/80 shadow-inner focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/15">
                    <textarea
                      className="block w-full resize-none border-0 bg-transparent px-3.5 py-2.5 text-sm text-black placeholder:text-black/35 focus:outline-none focus:ring-0"
                      placeholder="Mesajınızı yazın…"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void submitMessage();
                        }
                      }}
                      maxLength={2000}
                      rows={3}
                    />
                    <div className="flex items-center justify-between gap-2 border-t border-black/6 bg-white/80 px-3 py-2">
                      <span className="text-[10px] text-black/35">
                        Enter gönder · Shift+Enter satır
                      </span>
                      <button
                        type="submit"
                        disabled={sending || !text.trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {sending ? (
                          "Gönderiliyor…"
                        ) : (
                          <>
                            Gönder
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                              />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {sendError ? (
                    <p className="mt-2 text-xs text-red-600">{sendError}</p>
                  ) : null}
                </div>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-dashed border-black/12 bg-zinc-50 px-4 py-5 text-center">
              <p className="text-sm text-black/60">
                Sohbete katılmak için{" "}
                <Link
                  href={`/giris?next=${encodeURIComponent(listingPath)}`}
                  className="font-semibold text-emerald-800 underline-offset-2 hover:underline"
                >
                  giriş yapın
                </Link>
              </p>
            </div>
          )
        ) : (
          <p className="text-center text-sm text-black/45">
            Bu ilan için sohbet kapalı.
          </p>
        )}
      </footer>
    </section>
  );
}
