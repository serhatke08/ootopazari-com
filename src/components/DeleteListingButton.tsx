"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  listingId: string;
  listingLabel?: string;
};

export function DeleteListingButton({ listingId, listingLabel }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onDelete = useCallback(async () => {
    const label = listingLabel ?? "bu ilan";
    if (
      !window.confirm(
        `${label} kalıcı olarak silinecek. Emin misiniz?`
      )
    ) {
      return;
    }
    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = `/giris?next=${encodeURIComponent("/profil/ilanlarim")}`;
        return;
      }
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", listingId)
        .eq("user_id", user.id);
      if (error) throw error;
      router.refresh();
      router.push("/profil/ilanlarim");
    } catch (e) {
      console.error(e);
      alert(
        e instanceof Error
          ? e.message
          : "İlan silinemedi. Oturum veya veritabanı izinlerini kontrol edin."
      );
    } finally {
      setPending(false);
    }
  }, [listingId, listingLabel, router]);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void onDelete()}
      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "Siliniyor…" : "Sil"}
    </button>
  );
}
