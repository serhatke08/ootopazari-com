"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getSupportAgentUserId,
  SUPPORT_AGENT_DISPLAY_NAME,
} from "@/lib/support-agent";
import type { SupportMessageRow, SupportThreadSummary } from "@/lib/support-chat";

type Props = {
  currentUserId: string;
  isSupportAgent: boolean;
  initialThreadId: string;
  initialMessages: SupportMessageRow[];
  supportThreads?: SupportThreadSummary[];
};

function formatWhen(value: string): string {
  return new Date(value).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SupportChatClient({
  currentUserId,
  isSupportAgent,
  initialThreadId,
  initialMessages,
  supportThreads = [],
}: Props) {
  const supportAgentUserId = getSupportAgentUserId();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [threadId, setThreadId] = useState(initialThreadId);
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel(`support:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const row = payload.new as SupportMessageRow;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, threadId]);

  async function loadThread(nextThreadId: string) {
    if (!isSupportAgent || nextThreadId === threadId) return;
    setLoadingThread(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("support_messages")
        .select("id,thread_id,sender_id,content,created_at")
        .eq("thread_id", nextThreadId)
        .order("created_at", { ascending: true });

      if (fetchErr) {
        setError(fetchErr.message);
        return;
      }
      setThreadId(nextThreadId);
      setMessages((data ?? []) as SupportMessageRow[]);
    } finally {
      setLoadingThread(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !threadId || sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/support/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, content: trimmed }),
      });
      const data = (await res.json()) as { error?: string; message?: SupportMessageRow };
      if (!res.ok) {
        setError(data.error ?? "Mesaj gönderilemedi.");
        return;
      }
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message!.id)) return prev;
          return [...prev, data.message!];
        });
      }
      setText("");
    } catch {
      setError("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={isSupportAgent ? "grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]" : ""}>
      {isSupportAgent ? (
        <aside className="rounded-xl border border-zinc-200 bg-white p-2">
          <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Gelen destek mesajları
          </p>
          <ul className="mt-1 max-h-[28rem] space-y-1 overflow-y-auto">
            {supportThreads.length === 0 ? (
              <li className="px-2 py-4 text-center text-xs text-zinc-500">
                Henüz destek mesajı yok.
              </li>
            ) : (
              supportThreads.map((thread) => {
                const active = thread.id === threadId;
                return (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => void loadThread(thread.id)}
                      className={`w-full rounded-lg px-2 py-2 text-left transition ${
                        active ? "bg-zinc-900 text-white" : "hover:bg-zinc-50"
                      }`}
                    >
                      <p className="truncate text-sm font-semibold">
                        {thread.userDisplayName}
                      </p>
                      {thread.lastMessage ? (
                        <p
                          className={`mt-0.5 line-clamp-2 text-xs ${
                            active ? "text-zinc-200" : "text-zinc-500"
                          }`}
                        >
                          {thread.lastMessage}
                        </p>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>
      ) : null}

      <div className="flex min-h-[28rem] flex-col rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <p className="text-sm font-bold text-zinc-900">
            {isSupportAgent ? "Destek yanıtı" : SUPPORT_AGENT_DISPLAY_NAME}
          </p>
          <p className="mt-0.5 text-xs text-zinc-600">
            {isSupportAgent
              ? "Kullanıcı mesajlarına buradan yanıt verin."
              : "Mesajlarınız destek ekibine iletilir; yanıtlar burada görünür."}
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {loadingThread ? (
            <p className="text-center text-sm text-zinc-500">Yükleniyor…</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-zinc-500">
              Henüz mesaj yok. Sorununuzu yazıp gönderin.
            </p>
          ) : (
            messages.map((message) => {
              const mine = message.sender_id === currentUserId;
              const fromSupportAgent =
                !mine && message.sender_id === supportAgentUserId;
              return (
                <div
                  key={message.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-200 bg-zinc-50 text-zinc-900"
                    }`}
                  >
                    {fromSupportAgent ? (
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                        {SUPPORT_AGENT_DISPLAY_NAME}
                      </p>
                    ) : null}
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        mine ? "text-zinc-300" : "text-zinc-500"
                      }`}
                    >
                      {formatWhen(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={(e) => void handleSend(e)} className="border-t border-zinc-200 p-3">
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="Mesajınızı yazın…"
              className="min-h-[2.75rem] flex-1 resize-y rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="self-end rounded-lg bg-[#ffcc00] px-4 py-2 text-sm font-extrabold text-black hover:bg-[#ffd84d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "…" : "Gönder"}
            </button>
          </div>
          {error ? (
            <p className="mt-2 text-xs text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
