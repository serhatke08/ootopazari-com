"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminListingRow } from "@/lib/admin-listings-types";
import { CenteredDialog } from "@/components/CenteredDialog";

type Props = {
  initialRows: AdminListingRow[];
};

export function AdminListingsTable({ initialRows }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [suspendTarget, setSuspendTarget] = useState<AdminListingRow | null>(
    null
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleDelete(row: AdminListingRow) {
    const label = row.listing_number
      ? `#${row.listing_number} — ${row.title ?? "İlan"}`
      : row.title ?? "İlan";
    if (!window.confirm(`${label} kalıcı olarak silinecek. Emin misiniz?`)) {
      return;
    }
    setLoadingId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/listings/${encodeURIComponent(row.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok) {
        setError(data.message ?? "Silinemedi.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      router.refresh();
    } catch {
      setError("Ağ hatası.");
    } finally {
      setLoadingId(null);
    }
  }

  async function submitSuspend() {
    if (!suspendTarget) return;
    const t = reason.trim();
    if (t.length < 3) {
      setError("Sebep en az 3 karakter olmalı.");
      return;
    }
    setLoadingId(suspendTarget.id);
    setError(null);
    try {
      const res = await fetch("/api/listings/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: suspendTarget.id, reason: t }),
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
              : "Askıya alınamadı.")
        );
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === suspendTarget.id
            ? { ...r, moderation_status: "suspended" }
            : r
        )
      );
      setSuspendTarget(null);
      setReason("");
      router.refresh();
    } catch {
      setError("Ağ hatası.");
    } finally {
      setLoadingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-600">
        Gösterilecek ilan yok.
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
      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
            <tr>
              <th className="px-3 py-2.5">Sıra</th>
              <th className="px-3 py-2.5">İlan no</th>
              <th className="px-3 py-2.5">Başlık</th>
              <th className="px-3 py-2.5">Kapak</th>
              <th className="px-3 py-2.5">Kaynak</th>
              <th className="px-3 py-2.5">Katman</th>
              <th className="px-3 py-2.5">Geride</th>
              <th className="px-3 py-2.5">Durum</th>
              <th className="px-3 py-2.5 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row) => {
              const busy = loadingId === row.id;
              const suspended =
                String(row.moderation_status ?? "").toLowerCase() ===
                "suspended";
              return (
                <tr key={row.id} className="text-zinc-800">
                  <td className="px-3 py-2 font-mono text-xs">{row.feed_rank}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {row.listing_number ?? "—"}
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-2">
                    {row.title ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {row.cover_quality_score != null
                      ? row.cover_quality_score.toFixed(1)
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.cover_quality_source ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">{row.tier_label}</td>
                  <td className="px-3 py-2 text-xs">
                    {row.is_demoted ? "Evet" : "Hayır"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.moderation_status ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy || suspended}
                        onClick={() => {
                          setError(null);
                          setReason("");
                          setSuspendTarget(row);
                        }}
                        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
                      >
                        Askıya al
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDelete(row)}
                        className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {suspendTarget ? (
        <CenteredDialog
          title="İlanı askıya al"
          titleId="admin-suspend-dialog-title"
          onClose={() => setSuspendTarget(null)}
        >
          <p className="text-sm text-zinc-600">
            #{suspendTarget.listing_number ?? "?"} — {suspendTarget.title ?? "İlan"}
          </p>
          <label
            htmlFor="admin-suspend-reason"
            className="mt-4 block text-sm font-medium text-zinc-800"
          >
            Sebep
          </label>
          <textarea
            id="admin-suspend-reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Kullanıcıya bildirimde gösterilecek gerekçe…"
            className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
          />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={loadingId != null}
              onClick={() => setSuspendTarget(null)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="button"
              disabled={loadingId != null}
              onClick={() => void submitSuspend()}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loadingId ? "Kaydediliyor…" : "Askıya al"}
            </button>
          </div>
        </CenteredDialog>
      ) : null}
    </>
  );
}
