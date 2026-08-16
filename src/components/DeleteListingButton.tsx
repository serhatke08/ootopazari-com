"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  listingId: string;
  listingLabel?: string;
  variant?: "button" | "overlay";
};

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-4 w-4"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0115.916 21.75H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

export function DeleteListingButton({
  listingId,
  listingLabel,
  variant = "button",
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onDelete = useCallback(async () => {
    const label = listingLabel ?? "bu ilan";
    if (!window.confirm(`${label} kalıcı olarak silinecek. Emin misiniz?`)) {
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
      aria-label={pending ? "Siliniyor" : "İlanı sil"}
      className={
        variant === "overlay"
          ? "inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-600/80 text-white backdrop-blur-sm transition hover:bg-red-600 disabled:opacity-50"
          : "rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
      }
    >
      {variant === "overlay" ? (
        pending ? (
          <span className="text-[10px] font-bold">…</span>
        ) : (
          <TrashIcon />
        )
      ) : pending ? (
        "Siliniyor…"
      ) : (
        "Sil"
      )}
    </button>
  );
}
