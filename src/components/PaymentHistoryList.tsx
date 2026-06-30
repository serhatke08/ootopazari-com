import Link from "next/link";
import type {
  PaymentHistoryEntry,
  PaymentServiceSummary,
} from "@/lib/payment-history";
import {
  formatPaymentHistoryAmount,
  paymentHistoryStatusTone,
} from "@/lib/payment-history";
import { DEALER_TYPE_LABELS, type DealerType } from "@/lib/bayi-types";

const toneClasses = {
  emerald: "border-emerald-200 bg-emerald-50/80 text-emerald-950",
  amber: "border-amber-200 bg-amber-50/80 text-amber-950",
  red: "border-red-200 bg-red-50/80 text-red-950",
} as const;

type Props = {
  entries: PaymentHistoryEntry[];
};

type SummaryProps = {
  summaries: PaymentServiceSummary[];
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRemaining(value?: string | null): string | null {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;

  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return "Süre doldu";

  const totalHours = Math.ceil(diffMs / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0 && hours > 0) return `${days} gün ${hours} saat kaldı`;
  if (days > 0) return `${days} gün kaldı`;
  return `${hours || 1} saat kaldı`;
}

function entryExpiry(entry: PaymentHistoryEntry): {
  label: string;
  value: string;
  remaining: string | null;
} | null {
  const value =
    entry.kind === "bayi_membership"
      ? entry.membershipExpiresAt
      : entry.featureBoostEndsAt;
  if (!value || entry.status !== "paid") return null;

  return {
    label: entry.kind === "bayi_membership" ? "Abonelik bitişi" : "Öne çıkarma bitişi",
    value: formatDateTime(value),
    remaining: formatRemaining(value),
  };
}

export function PaymentServiceSummaryList({ summaries }: SummaryProps) {
  if (summaries.length === 0) return null;

  return (
    <section className="mt-6">
      <h3 className="text-sm font-black text-zinc-950">Aktif hizmetler</h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {summaries.map((summary) => {
          const remaining = formatRemaining(summary.expiresAt);
          return (
            <li
              key={summary.id}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm"
            >
              <p className="font-bold text-zinc-950">{summary.title}</p>
              {summary.detail ? (
                <p className="mt-1 text-sm text-zinc-600">{summary.detail}</p>
              ) : null}
              {summary.expiresAt ? (
                <p className="mt-3 text-xs font-semibold text-zinc-800">
                  Bitiş: {formatDateTime(summary.expiresAt)}
                  {remaining ? ` · ${remaining}` : ""}
                </p>
              ) : (
                <p className="mt-3 text-xs font-semibold text-amber-800">
                  Bitiş tarihi bekleniyor
                </p>
              )}
              <Link
                href={summary.href}
                className="mt-3 inline-flex text-xs font-bold text-zinc-900 underline"
              >
                Detaya git
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PaymentServiceCompactSummary({ summaries }: SummaryProps) {
  if (summaries.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {summaries.slice(0, 4).map((summary) => {
        const remaining = formatRemaining(summary.expiresAt);
        return (
          <Link
            key={summary.id}
            href={summary.href}
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm hover:border-amber-300 hover:bg-amber-50"
          >
            {summary.title}
            {remaining ? ` · ${remaining}` : ""}
          </Link>
        );
      })}
      {summaries.length > 4 ? (
        <Link
          href="/profil/odemeler"
          className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          +{summaries.length - 4} hizmet
        </Link>
      ) : null}
    </div>
  );
}

export function PaymentHistoryList({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center">
        <p className="font-semibold text-zinc-900">Henüz ödeme geçmişi yok</p>
        <p className="mt-2 text-sm text-zinc-600">
          PayTR ödeme kaydı oluştuğunda burada listelenir. Aktif üyelik ve öne
          çıkarma süreleri varsa üstteki aktif hizmetler bölümünde görünür.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href="/ilan-one-cikar"
            className="rounded-lg bg-[#ffc400] px-4 py-2 text-sm font-black text-black hover:bg-[#ffd24d]"
          >
            İlan öne çıkar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ul className="mt-6 space-y-3">
      {entries.map((entry) => {
        const tone = paymentHistoryStatusTone(entry.status);
        const when = entry.paidAt ?? entry.createdAt;
        const expiry = entryExpiry(entry);
        return (
          <li
            key={entry.id}
            className={`rounded-xl border px-4 py-4 ${toneClasses[tone]}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold">{entry.title}</p>
                {entry.detail ? (
                  <p className="mt-1 text-sm opacity-90">{entry.detail}</p>
                ) : null}
                <p className="mt-2 break-all font-mono text-[10px] opacity-60 sm:text-xs">
                  {entry.merchantOid}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black tabular-nums">
                  {entry.amountKurus && entry.amountKurus > 0
                    ? formatPaymentHistoryAmount(entry.amountKurus)
                    : "Tutar kaydı yok"}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-80">
                  {entry.status === "paid"
                    ? "Ödendi"
                    : entry.status === "failed"
                      ? "Başarısız"
                      : "Beklemede"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-80">
              <time dateTime={when}>{formatDateTime(when)}</time>
              {entry.kind === "bayi_membership" && entry.dealerType ? (
                <Link
                  href={`/bayi/panel/${entry.dealerType}`}
                  className="font-semibold underline"
                >
                  {DEALER_TYPE_LABELS[entry.dealerType as DealerType]} paneli
                </Link>
              ) : null}
              {entry.kind === "feature_boost" ? (
                <Link href="/profil/ilanlarim" className="font-semibold underline">
                  İlanlarım
                </Link>
              ) : null}
            </div>
            {entry.inferredFromService ? (
              <p className="mt-2 text-xs opacity-70">
                PayTR işlem kaydı bulunamadı; bu satır ilan hizmet süresinden
                oluşturuldu.
              </p>
            ) : null}
            {expiry ? (
              <div className="mt-3 rounded-lg border border-current/15 bg-white/45 px-3 py-2 text-xs">
                <p className="font-semibold">{expiry.label}</p>
                <p className="mt-1 opacity-85">
                  {expiry.value}
                  {expiry.remaining ? ` · ${expiry.remaining}` : ""}
                </p>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
