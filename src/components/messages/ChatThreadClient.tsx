"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MessageRow } from "@/lib/messages";
import { dispatchUnreadMessagesRefresh } from "@/lib/unread-messages-events";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageRow[];
  listingTitle: string | null;
  listingHref: string | null;
  otherUserName: string;
  otherUserAvatarUrl: string | null;
  blocked: boolean;
};

export function ChatThreadClient({
  conversationId,
  currentUserId,
  initialMessages,
  listingTitle,
  listingHref,
  otherUserName,
  otherUserAvatarUrl,
  blocked,
}: Props) {
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /** Açılışta karşı tarafın okunmamış mesajlarını okundu işaretle (mobil ile uyumlu). */
  useEffect(() => {
    if (blocked) return;
    let cancelled = false;
    (async () => {
      // UPDATE + .or() PostgREST’te hata verebiliyor; iki ayrı güncelleme.
      const { error: e1 } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", currentUserId)
        .eq("is_read", false);
      const { error: e2 } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", currentUserId)
        .is("is_read", null);
      const error = e1 ?? e2;
      if (error && !cancelled) {
        console.warn("mark read:", error.message);
      } else if (!error && !cancelled) {
        dispatchUnreadMessagesRefresh();
      }
      if (!cancelled) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_id !== currentUserId && m.is_read !== true
              ? { ...m, is_read: true }
              : m
          )
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blocked, conversationId, currentUserId, supabase]);

  useEffect(() => {
    if (blocked) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as MessageRow;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
          if (row.sender_id !== currentUserId) {
            void supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", row.id)
              .then(({ error: markErr }) => {
                if (!markErr) dispatchUnreadMessagesRefresh();
              });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [blocked, conversationId, currentUserId, supabase]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || blocked) return;
    setSendError(null);
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: trimmed,
        is_read: false,
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

  if (blocked) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Bu kullanıcıyla mesajlaşamazsınız.
      </p>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {listingTitle ? (
        <p className="mb-2 text-xs text-zinc-600">
          İlan:{" "}
          {listingHref ? (
            <Link
              href={listingHref}
              className="font-medium text-emerald-800 underline-offset-2 hover:underline"
            >
              {listingTitle}
            </Link>
          ) : (
            <span className="font-medium text-zinc-800">{listingTitle}</span>
          )}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 sm:p-4">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-zinc-500">
            Henüz mesaj yok. İlk mesajı siz gönderin.
          </p>
        ) : (
          messages.map((m, idx) => {
            const mine = m.sender_id === currentUserId;
            if (mine) {
              return (
                <div
                  key={m.id}
                  className="w-fit max-w-[92%] self-end rounded-2xl rounded-br-md bg-[#ffcc00] px-2.5 py-1.5 text-xs text-zinc-900 shadow-sm md:max-w-[88%]"
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  {m.created_at ? (
                    <p className="mt-1 text-[9px] text-zinc-700/80">
                      {new Date(m.created_at).toLocaleString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  ) : null}
                </div>
              );
            }

            return (
              <div
                key={m.id}
                className="flex w-full max-w-[92%] items-end gap-2 self-start md:max-w-[88%]"
              >
                {(() => {
                  const next = messages[idx + 1];
                  const showAvatar = !next || next.sender_id === currentUserId;
                  return (
                    <div
                      className={`relative h-7 w-7 shrink-0 overflow-hidden rounded-full ${
                        showAvatar ? "bg-zinc-200" : "bg-transparent"
                      }`}
                    >
                      {showAvatar ? (
                        otherUserAvatarUrl ? (
                          <Image
                            src={otherUserAvatarUrl}
                            alt=""
                            width={28}
                            height={28}
                            className="h-7 w-7 object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-zinc-600">
                            {otherUserName.trim().slice(0, 1).toUpperCase() || "?"}
                          </div>
                        )
                      ) : null}
                    </div>
                  );
                })()}
                <div className="w-fit max-w-full rounded-2xl rounded-bl-md bg-white px-2.5 py-1.5 text-xs text-zinc-900 shadow-sm ring-1 ring-zinc-200">
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  {m.created_at ? (
                    <p className="mt-1 text-[9px] text-zinc-500">
                      {new Date(m.created_at).toLocaleString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="mt-4 flex gap-2">
        <label htmlFor="msg-input" className="sr-only">
          Mesaj yazın
        </label>
        <textarea
          id="msg-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mesajınızı yazın…"
          rows={2}
          className="min-h-[44px] flex-1 resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-[#ffcc00] focus:outline-none focus:ring-2 focus:ring-amber-300/80"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="shrink-0 self-end rounded-lg bg-[#ffcc00] px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-amber-300 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50"
        >
          {sending ? "…" : "Gönder"}
        </button>
      </form>
      {sendError ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {sendError}
        </p>
      ) : null}
    </div>
  );
}
