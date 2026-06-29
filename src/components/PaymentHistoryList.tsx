import Link from "next/link";
import type { PaymentHistoryEntry } from "@/lib/payment-history";
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

export function PaymentHistoryList({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center">
        <p className="font-semibold text-zinc-900">Henüz ödeme geçmişi yok</p>
        <p className="mt-2 text-sm text-zinc-600">
          İlan öne çıkarma veya bayi üyeliği ödemeleriniz burada listelenir.
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
                  {formatPaymentHistoryAmount(entry.amountKurus)}
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
              <time dateTime={when}>
                {new Date(when).toLocaleString("tr-TR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
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
          </li>
        );
      })}
    </ul>
  );
}
