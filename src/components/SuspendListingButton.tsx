"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CenteredDialog } from "@/components/CenteredDialog";

type Props = {
  listingId: string;
  listingLabel: string;
  variant?: "button" | "overlay";
};

export function SuspendListingButton({
  listingId,
  listingLabel,
  variant = "button",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const t = reason.trim();
    if (t.length < 3) {
      setError("Sebep en az 3 karakter olmalı.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/listings/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, reason: t }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(
          data.message ??
            (data.error === "already_suspended"
              ? "Bu ilan zaten askıda."
              : "İşlem başarısız.")
        );
        setLoading(false);
        return;
      }
      setOpen(false);
      setReason("");
      router.refresh();
    } catch {
      setError("Ağ hatası.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError(null);
          setReason("");
        }}
        aria-label="Askıya al"
        className={
          variant === "overlay"
            ? "inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-[11px] font-bold text-white backdrop-blur-sm transition hover:bg-black/60"
            : "rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100"
        }
      >
        {variant === "overlay" ? "!" : "Askıya al"}
      </button>

      {open ? (
        <CenteredDialog
          title="İlanı askıya al"
          titleId="suspend-dialog-title"
          onClose={() => setOpen(false)}
        >
          <p className="text-sm text-zinc-600">{listingLabel}</p>
          <label htmlFor="suspend-reason" className="mt-4 block text-sm font-medium text-zinc-800">
            Sebep
          </label>
          <textarea
            id="suspend-reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Kullanıcıya bildirimde gösterilecek gerekçe…"
            className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
          />
          {error ? (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => setOpen(false)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void submit()}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Kaydediliyor…" : "Askıya al"}
            </button>
          </div>
        </CenteredDialog>
      ) : null}
    </>
  );
}
