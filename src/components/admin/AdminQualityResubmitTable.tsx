"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminQualityResubmitRow } from "@/lib/admin-quality-resubmit";
import { CenteredDialog } from "@/components/CenteredDialog";

type Props = {
  initialRows: AdminQualityResubmitRow[];
};

export function AdminQualityResubmitTable({ initialRows }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [rejectTarget, setRejectTarget] = useState<AdminQualityResubmitRow | null>(
    null
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  function rowKey(row: AdminQualityResubmitRow) {
    return `${row.storage_table}:${row.id}`;
  }

  async function handleApprove(row: AdminQualityResubmitRow) {
    const key = rowKey(row);
    setLoadingKey(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/quality-resubmit/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: row.id,
          storageTable: row.storage_table,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Onaylanamadı.");
        return;
      }
      setRows((prev) => prev.filter((r) => rowKey(r) !== key));
      router.refresh();
    } catch {
      setError("Ağ hatası.");
    } finally {
      setLoadingKey(null);
    }
  }

  async function submitReject() {
    if (!rejectTarget) return;
    const key = rowKey(rejectTarget);
    setLoadingKey(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/quality-resubmit/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: rejectTarget.id,
          storageTable: rejectTarget.storage_table,
          reason: reason.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Reddedilemedi.");
        return;
      }
      setRows((prev) => prev.filter((r) => rowKey(r) !== key));
      setRejectTarget(null);
      setReason("");
      router.refresh();
    } catch {
      setError("Ağ hatası.");
    } finally {
      setLoadingKey(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="mt-6 text-sm text-zinc-600">
        Onay bekleyen ilan yok.
      </p>
    );
  }

  return (
    <>
      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="mt-6 space-y-3">
        {rows.map((row) => {
          const key = rowKey(row);
          const busy = loadingKey === key;
          const num =
            row.listing_number != null ? String(row.listing_number) : "—";
          return (
            <li
              key={key}
              className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 sm:flex-row sm:items-center"
            >
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                {row.image_url ? (
                  <Image
                    src={row.image_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="96px"
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-zinc-900">
                  #{num} — {row.title ?? "İlan"}
                </p>
                <p className="text-xs text-zinc-500">
                  Kapak puanı:{" "}
                  {row.cover_quality_score != null
                    ? row.cover_quality_score.toFixed(1)
                    : "—"}
                  {" · "}
                  Gönderim:{" "}
                  {row.quality_resubmit_at
                    ? new Date(row.quality_resubmit_at).toLocaleString("tr-TR")
                    : "—"}
                </p>
                <p className="text-[11px] text-zinc-400">{row.storage_table}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleApprove(row)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Onayla
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setRejectTarget(row);
                    setReason("");
                    setError(null);
                  }}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  Reddet
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {rejectTarget ? (
        <CenteredDialog
          title="İlanı reddet"
          titleId="admin-quality-reject-dialog-title"
          onClose={() => {
            if (loadingKey) return;
            setRejectTarget(null);
            setReason("");
          }}
        >
          <p className="text-sm text-zinc-600">
            İlan tekrar pasife alınır. Sebep (isteğe bağlı) ilan sahibine
            gösterilebilir.
          </p>
          <textarea
            className="mt-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Sebep (isteğe bağlı)"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-600"
              onClick={() => setRejectTarget(null)}
              disabled={!!loadingKey}
            >
              Vazgeç
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              onClick={() => void submitReject()}
              disabled={!!loadingKey}
            >
              Pasife al
            </button>
          </div>
        </CenteredDialog>
      ) : null}
    </>
  );
}
