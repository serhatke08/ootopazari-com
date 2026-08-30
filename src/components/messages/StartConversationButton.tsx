"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getClientAuthUser } from "@/lib/supabase/auth-client";
import { findConversationForListingAndPair, unhideOwnConversation } from "@/lib/messages";
import { mapMessagingError } from "@/lib/messaging-errors";

type Props = {
  listingId: string;
  ownerUserId: string;
  label?: string;
  className?: string;
};

export function StartConversationButton({
  listingId,
  ownerUserId,
  label = "Mesaj gönder",
  className,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const user = await getClientAuthUser(supabase);
      if (!user) {
        const next = pathname || "/";
        router.push(`/giris?next=${encodeURIComponent(next)}`);
        return;
      }
      if (user.id === ownerUserId) return;

      const [{ data: b1 }, { data: b2 }] = await Promise.all([
        supabase
          .from("user_blocks")
          .select("id")
          .eq("blocker_id", user.id)
          .eq("blocked_id", ownerUserId)
          .limit(1),
        supabase
          .from("user_blocks")
          .select("id")
          .eq("blocker_id", ownerUserId)
          .eq("blocked_id", user.id)
          .limit(1),
      ]);

      if ((b1?.length ?? 0) > 0 || (b2?.length ?? 0) > 0) {
        setError("Bu kullanıcıyla mesajlaşamazsınız.");
        return;
      }

      const existing = await findConversationForListingAndPair(
        supabase,
        listingId,
        user.id,
        ownerUserId
      );

      let convId = existing?.id;
      if (!convId) {
        const insertPayload: Record<string, string> = {
            listing_id: listingId,
            sender_id: user.id,
            receiver_id: ownerUserId,
          };
        const { data: inserted, error: insErr } = await supabase
          .from("conversations")
          .insert({
            ...insertPayload,
            listing_table: "listings",
          })
          .select("id")
          .single();

        if (insErr) {
          if (insErr.code === "23505") {
            const raced = await findConversationForListingAndPair(
              supabase,
              listingId,
              user.id,
              ownerUserId
            );
            convId = raced?.id;
          } else if (/listing_table/i.test(insErr.message)) {
            const { data: legacyInsert, error: legacyErr } = await supabase
              .from("conversations")
              .insert(insertPayload)
              .select("id")
              .single();
            if (legacyErr) {
              if (legacyErr.code === "23505") {
                const raced = await findConversationForListingAndPair(
                  supabase,
                  listingId,
                  user.id,
                  ownerUserId
                );
                convId = raced?.id;
              } else {
                setError(mapMessagingError(legacyErr.message));
                return;
              }
            } else {
              convId = legacyInsert?.id as string | undefined;
            }
          } else {
            setError(mapMessagingError(insErr.message));
            return;
          }
        } else {
          convId = inserted?.id as string | undefined;
        }
      }

      if (!convId) {
        setError("Konuşma açılamadı.");
        return;
      }

      await unhideOwnConversation(supabase, convId, user.id);
      router.push(`/mesajlar/${convId}`);
    } catch {
      setError("Bağlantı kurulamadı. İnternet veya Supabase ayarlarını kontrol edin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full [&:not(:first-child)]:mt-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          "inline-flex w-full items-center justify-center rounded-lg bg-[#ffcc00] px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-amber-300 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-60"
        }
      >
        {loading ? "Açılıyor…" : label}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
