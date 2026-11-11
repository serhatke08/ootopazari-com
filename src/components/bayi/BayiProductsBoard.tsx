import Link from "next/link";
import type { DealerType } from "@/lib/bayi-types";
import { getAddProductButtonText } from "@/lib/dealer-listing-tables";
import { dealerTheme } from "@/lib/dealer-theme";
import type { ListingQuotaSnapshot } from "@/lib/listing-quota";
import { PAID_LISTING_ACTIVATION_FEE_TRY } from "@/lib/listing-quota";

export type BayiProductRow = {
  id: string;
  title?: string | null;
  price?: number | null;
  created_at?: string | null;
  image_url?: string | null;
};

type Props = {
  dealerType: DealerType;
  listings: BayiProductRow[];
  quota: ListingQuotaSnapshot | null;
};

export function BayiProductsBoard({ dealerType, listings, quota }: Props) {
  const theme = dealerTheme(dealerType);
  const addLabel = getAddProductButtonText(dealerType);
  const galeriQuota =
    dealerType === "galeri" && quota && !quota.unlimited
      ? `${quota.remaining}/${quota.limit} ücretsiz ilan kaldı`
      : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            Stok
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900">
            {addLabel}
          </h2>
          {dealerType === "galeri" ? (
            <p className="mt-1 text-sm text-zinc-600">
              Galeri hesabında yılda 5 ilan ücretsiz. Sonrası {PAID_LISTING_ACTIVATION_FEE_TRY} TL paket.
              {galeriQuota ? ` ${galeriQuota}.` : null}
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-600">
              Aktif bayilikte ürün ve araçlarını buradan yönet.
            </p>
          )}
        </div>
        <Link
          href="/ilan-ver"
          className="rounded-xl px-4 py-2.5 text-sm font-black text-white"
          style={{ backgroundColor: theme.primary }}
        >
          {addLabel}
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center">
          <p className="font-semibold text-zinc-800">Henüz kayıt yok</p>
          <p className="mt-1 text-sm text-zinc-500">İlk ilanı ver, vitrin dolsun.</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          {listings.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-zinc-900">
                  {row.title || "İlan"}
                </p>
                <p className="text-xs text-zinc-500">
                  {row.price != null
                    ? `₺${Number(row.price).toLocaleString("tr-TR")}`
                    : "Fiyat yok"}
                </p>
              </div>
              <Link
                href="/profil/ilanlarim"
                className="shrink-0 text-sm font-semibold text-zinc-700 hover:text-zinc-950"
              >
                İlanlarım
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
