import Link from "next/link";
import {
  LISTING_QUALITY_SCORE_TIPS,
  listingCoverQualityScoreValue,
  listingQualityScoreTone,
} from "@/lib/listing-quality";

type Props = {
  listing: {
    cover_quality_score?: unknown;
    listing_number?: number | string | null;
  };
  editHref?: string | null;
  /** Kart üstü tek satır (İlanlarım grid). */
  variant?: "full" | "inline";
  /** @deprecated `variant="inline"` kullanın */
  compact?: boolean;
};

const toneStyles = {
  excellent: {
    border: "border-emerald-300",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    badge: "bg-emerald-600",
    status: "Üst görünürlük — vitrinde öncelikli",
  },
  medium: {
    border: "border-amber-300",
    bg: "bg-amber-50",
    text: "text-amber-900",
    badge: "bg-amber-600",
    status: "Orta puan (5–8) — düşük görünürlük bandında",
  },
  low: {
    border: "border-red-300",
    bg: "bg-red-50",
    text: "text-red-800",
    badge: "bg-red-600",
    status: "Çok düşük — yayından kaldırılma riski",
  },
  pending: {
    border: "border-zinc-300",
    bg: "bg-zinc-50",
    text: "text-zinc-700",
    badge: "bg-zinc-500",
    status: "Henüz puanlanmadı",
  },
} as const;

export function ListingQualityOwnerScorePanel({
  listing,
  editHref = null,
  variant = "full",
  compact = false,
}: Props) {
  const score = listingCoverQualityScoreValue(listing);
  const tone = listingQualityScoreTone(score);
  const styles = toneStyles[tone];
  const scoreLabel =
    score != null ? `${score.toFixed(1)} / 10` : "— / 10";
  const resolvedVariant = compact ? "inline" : variant;

  if (resolvedVariant === "inline") {
    const showMediumHint =
      score != null && score >= 5 && score <= 8;
    return (
      <div
        className={`mb-1.5 flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] leading-tight ${styles.border} ${styles.bg}`}
      >
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black text-white ${styles.badge}`}
        >
          {score != null ? score.toFixed(1) : "—"}
        </span>
        <span className={`min-w-0 flex-1 font-medium ${styles.text}`}>
          {showMediumHint
            ? "8+ puan vitrinde önde — puanı yükseltin"
            : styles.status}
        </span>
        {editHref && (score == null || score <= 8) ? (
          <Link
            href={editHref}
            className={`shrink-0 font-semibold underline ${styles.text}`}
          >
            Düzelt
          </Link>
        ) : null}
      </div>
    );
  }

  const showMediumWarning =
    score != null && score >= 5 && score <= 8;

  return (
    <div
      className={`mb-2 rounded-xl border p-3 ${styles.border} ${styles.bg}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border text-xl font-black ${styles.border} bg-white ${styles.text}`}
        >
          {score != null ? score.toFixed(1) : "—"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-zinc-900">İlan kalite puanı</p>
          <p className={`text-sm font-semibold ${styles.text}`}>{scoreLabel}</p>
          <p className="mt-0.5 text-xs text-zinc-600">{styles.status}</p>
        </div>
      </div>

      {score == null ? (
        <p className="mt-2 text-xs text-zinc-600">
          Puan değerlendirme sonrası görünür. Fotoğraf, kapak ve açıklamayı
          eksiksiz doldurun.
        </p>
      ) : null}

      {showMediumWarning ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-100/80 px-2.5 py-2 text-xs leading-relaxed text-amber-950">
          <span className="font-semibold">8 üzeri puanlı ilanlar</span> kendi
          kategorisinde ve ana sayfada ön sıralarda yer alır. Puanınızı
          yükseltmek için aşağıdaki önerilere bakın.
        </p>
      ) : null}

      {tone !== "excellent" ? (
        <div className="mt-3">
          <p className="text-xs font-bold text-zinc-800">Puanı yükseltmek için</p>
          <ul className="mt-1.5 space-y-1">
            {LISTING_QUALITY_SCORE_TIPS.map((tip) => (
              <li
                key={tip}
                className="flex gap-1.5 text-xs leading-relaxed text-zinc-700"
              >
                <span className={`font-bold ${styles.text}`}>•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-xs text-emerald-900/80">
          İlanınız iyi durumda. Fotoğraf veya bilgi değişirse güncel tutun.
        </p>
      )}

      {editHref && (score == null || score <= 8) ? (
        <Link
          href={editHref}
          className="mt-3 inline-flex rounded-lg bg-[#7c3aed] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6d28d9]"
        >
          İlanı düzelt
        </Link>
      ) : null}
    </div>
  );
}
