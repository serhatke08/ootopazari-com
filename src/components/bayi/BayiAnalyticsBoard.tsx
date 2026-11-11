import type { DealerAnalytics, DealerType } from "@/lib/bayi-types";
import { dealerTheme } from "@/lib/dealer-theme";

type Props = {
  dealerType: DealerType;
  storeName: string;
  analytics: DealerAnalytics | null;
};

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-black tabular-nums" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

export function BayiAnalyticsBoard({ dealerType, storeName, analytics }: Props) {
  const theme = dealerTheme(dealerType);
  const a = analytics;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Analitik</p>
      <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900">
        {storeName} performansı
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        İlan, görüntülenme ve favori özeti. Rakamlar kendi stokuna aittir.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="İlan / ürün"
          value={String(a?.total_listings ?? 0)}
          accent={theme.primary}
        />
        <Kpi
          label="Görüntülenme"
          value={String(a?.total_views ?? 0)}
          accent={theme.primaryDark}
        />
        <Kpi
          label="Favori"
          value={String(a?.total_favorites ?? 0)}
          accent="#db2777"
        />
        <Kpi
          label="Ort. görüntülenme"
          value={String(a?.avg_views_per_listing ?? 0)}
          accent="#b45309"
        />
      </div>
    </div>
  );
}
