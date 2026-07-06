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
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [comments, scrollToBottom]);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

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

  async function send(e: React.FormEvent) {
    e.preventDefault();
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

      const { error } = await supabase.from("listing_public_comments").insert({
        listing_id: listingId,
        user_id: user.id,
        body: trimmed,
      });

      if (error) {
        setSendError(error.message || "Gönderilemedi.");
        return;
      }
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 hidden min-[80rem]:flex min-[80rem]:flex-col rounded-xl border border-black/10 bg-white">
      <div className="border-b border-black/10 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-black/50">
          İlan sohbeti
        </p>
        <p className="mt-0.5 text-xs text-black/60">
          Soru sorun, yorum yapın — bu ilana özel herkese açık alan.
        </p>
      </div>

      <div className="flex max-h-[22rem] min-h-[10rem] flex-1 flex-col overflow-y-auto px-3 py-2">
        {comments.length === 0 ? (
          <p className="m-auto px-2 text-center text-sm text-black/45">
            Henüz mesaj yok. İlk soruyu veya yorumu siz yazın.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {comments.map((c) => {
              const isSeller = c.isSeller;
              const isSelf = viewerId != null && c.user_id === viewerId;
              return (
                <li
                  key={c.id}
                  className={`rounded-lg border px-2.5 py-2 ${
                    isSeller
                      ? "border-emerald-300/80 bg-emerald-50/90"
                      : isSelf
                        ? "border-black/10 bg-zinc-50"
                        : "border-black/8 bg-white"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    {c.authorAvatarUrl ? (
                      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-black/5">
                        <Image
                          src={c.authorAvatarUrl}
                          alt=""
                          width={28}
                          height={28}
                          className="h-7 w-7 object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                          isSeller
                            ? "bg-emerald-600 text-white"
                            : "bg-black/10 text-black/55"
                        }`}
                        aria-hidden
                      >
                        {c.authorName.trim().slice(0, 1).toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`truncate text-xs font-semibold ${
                            isSeller ? "text-emerald-900" : "text-black"
                          }`}
                        >
                          {c.authorName}
                        </span>
                        {isSeller ? (
                          <span className="shrink-0 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            Satıcı
                          </span>
                        ) : null}
                        {isSelf && !isSeller ? (
                          <span className="shrink-0 rounded bg-black/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-black/55">
                            Siz
                          </span>
                        ) : null}
                      </div>
                      <time
                        className="text-[10px] text-black/40"
                        dateTime={c.created_at}
                      >
                        {fmtTime(c.created_at)}
                      </time>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-snug text-black/85">
                    {c.body}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-black/10 p-3">
        {canPost ? (
          viewerId ? (
            <form onSubmit={send} className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                {viewerAvatarUrl ? (
                  <div className="relative mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full bg-black/5">
                    <Image
                      src={viewerAvatarUrl}
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/10 text-xs font-semibold text-black/55"
                    aria-hidden
                  >
                    {(viewerName ?? "?").trim().slice(0, 1).toUpperCase()}
                  </div>
                )}
                <textarea
                  className="min-h-[4.5rem] flex-1 resize-none rounded-lg border border-black/15 px-3 py-2 text-sm text-black placeholder:text-black/35 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30"
                  placeholder="Soru sorun veya yorum yazın…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={2000}
                  rows={3}
                />
              </div>
              {sendError ? (
                <p className="text-xs text-red-600">{sendError}</p>
              ) : null}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? "Gönderiliyor…" : "Gönder"}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-center text-sm text-black/60">
              Yorum yapmak için{" "}
              <Link
                href={`/giris?next=${encodeURIComponent(listingPath)}`}
                className="font-semibold text-emerald-800 underline-offset-2 hover:underline"
              >
                giriş yapın
              </Link>
              .
            </p>
          )
        ) : (
          <p className="text-center text-sm text-black/50">
            Bu ilan için sohbet kapalı.
          </p>
        )}
      </div>
    </div>
  );
}
