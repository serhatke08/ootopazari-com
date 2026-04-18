"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { findConversationForListingAndPair } from "@/lib/messages";

type Props = {
  listingId: string;
  ownerUserId: string;
};

export function StartConversationButton({ listingId, ownerUserId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
        const { data: inserted, error: insErr } = await supabase
          .from("conversations")
          .insert({
            listing_id: listingId,
            sender_id: user.id,
            receiver_id: ownerUserId,
          })
          .select("id")
          .single();

        if (insErr) {
          setError(insErr.message || "Konuşma oluşturulamadı.");
          return;
        }
        convId = inserted?.id as string | undefined;
      }

      if (!convId) {
        setError("Konuşma açılamadı.");
        return;
      }

      router.push(`/mesajlar/${convId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-lg bg-[#ffcc00] px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-amber-300 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-60"
      >
        {loading ? "Açılıyor…" : "Mesaj gönder"}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
