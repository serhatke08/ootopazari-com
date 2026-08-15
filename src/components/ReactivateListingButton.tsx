"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReactivateListingButton({
  listingId,
  remaining,
  unlimited,
}: {
  listingId: string;
  remaining: number;
  unlimited: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const canActivate = unlimited || remaining > 0;

  async function onClick() {
    if (!canActivate || loading) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/listings/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setErr(data.message ?? "Aktif edilemedi.");
        return;
      }
      router.refresh();
    } catch {
      setErr("Aktif edilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={loading || !canActivate}
        className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Aktif ediliyor…" : "Tekrar aktif et"}
      </button>
      {!canActivate ? (
        <p className="text-[10px] text-red-700">İlan hakkınız kalmadı.</p>
      ) : (
        <p className="text-[10px] text-zinc-500">1 ilan hakkı kullanır</p>
      )}
      {err ? (
        <p className="text-[10px] text-red-700" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
