"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { LISTING_REPORT_REASONS, type ListingReportReason } from "@/lib/listing-reports";

type Props = {
  listingId: string;
  shareTitle: string;
  /** Örn. `/ilan/12300075-slug` */
  sharePath: string;
  loggedIn: boolean;
  canReport: boolean;
};

export function ListingShareReportActions({
  listingId,
  shareTitle,
  sharePath,
  loggedIn,
  canReport,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<ListingReportReason>(LISTING_REPORT_REASONS[0]);
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const shareListing = useCallback(async () => {
    setShareFeedback(null);
    if (typeof window === "undefined") return;
    const url = new URL(sharePath, window.location.origin).href;
    const title = `${shareTitle} — Oto Pazarı`;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title, text: title, url });
        setShareFeedback("Paylaşıldı.");
        window.setTimeout(() => setShareFeedback(null), 2000);
        return;
      }
    } catch (e: unknown) {
      const name = e instanceof Error ? e.name : "";
      if (name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareFeedback("Bağlantı kopyalandı.");
    } catch {
      setShareFeedback("Kopyalanamadı.");
    }
    window.setTimeout(() => setShareFeedback(null), 2800);
  }, [sharePath, shareTitle]);

  function openReport() {
    if (!loggedIn) {
      const next = pathname || sharePath;
      router.push(`/giris?next=${encodeURIComponent(next)}`);
      return;
    }
    if (!canReport) return;
    setReportOpen(true);
    setError(null);
    setSuccess(false);
    setReason(LISTING_REPORT_REASONS[0]);
    setDetail("");
  }

  async function submitReport() {
    setError(null);
    if (reason === "Diğer" && detail.trim().length < 10) {
      setError("«Diğer» için en az 10 karakter açıklama girin.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/listings/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          reason,
          detail: detail.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        if (data.error === "unauthorized") {
          router.push(`/giris?next=${encodeURIComponent(pathname || sharePath)}`);
          return;
        }
        setError(
          data.message ??
            (data.error === "already_reported"
              ? "Bu ilanı zaten şikayet ettiniz."
              : "Şikayet gönderilemedi.")
        );
        return;
      }
      setSuccess(true);
    } catch {
      setError("Ağ hatası.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void shareListing()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-black/[0.03]"
        >
          <ShareIcon />
          Paylaş
        </button>
        <button
          type="button"
          onClick={openReport}
          disabled={!canReport && loggedIn}
          title={
            !loggedIn
              ? "Şikayet için giriş yapın"
              : !canReport
                ? "Bu ilan için şikayet kullanılamaz"
                : undefined
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <FlagIcon />
          Şikayet
        </button>
        {shareFeedback ? (
          <span className="text-xs text-black/55">{shareFeedback}</span>
        ) : null}
      </div>

      {reportOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-dialog-title"
        >
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-xl">
            <h2
              id="report-dialog-title"
              className="text-lg font-semibold text-zinc-900"
            >
              İlanı şikayet et
            </h2>
            <p className="mt-1 text-sm text-zinc-600">{shareTitle}</p>

            {success ? (
              <p className="mt-4 text-sm text-green-700" role="status">
                Şikayetiniz alındı. İnceleme sürecine alınacaktır.
              </p>
            ) : (
              <>
                <label
                  htmlFor="report-reason"
                  className="mt-4 block text-sm font-medium text-zinc-800"
                >
                  Sebep
                </label>
                <select
                  id="report-reason"
                  value={reason}
                  onChange={(e) =>
                    setReason(e.target.value as ListingReportReason)
                  }
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
                >
                  {LISTING_REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <label
                  htmlFor="report-detail"
                  className="mt-3 block text-sm font-medium text-zinc-800"
                >
                  Açıklama {reason === "Diğer" ? "(zorunlu)" : "(isteğe bağlı)"}
                </label>
                <textarea
                  id="report-detail"
                  rows={3}
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="Kısa açıklama…"
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
                />

                {error ? (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {error}
                  </p>
                ) : null}
              </>
            )}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setReportOpen(false)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
              >
                {success ? "Kapat" : "Vazgeç"}
              </button>
              {!success ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void submitReport()}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? "Gönderiliyor…" : "Gönder"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
      />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3v18M4 4h11l-1 4 5 2-5 2 1 4H4V4z"
      />
    </svg>
  );
}
