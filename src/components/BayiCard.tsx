import Link from "next/link";
import type { DealerProfile, DealerType, ExpertizPriceItem } from "@/lib/bayi-types";
import { resolveDealerCoverImageUrl } from "@/lib/bayi-data";
import { dealerTheme, parseAuthorizedBrands } from "@/lib/dealer-theme";
import { DealerVerifiedTick } from "@/components/bayi/DealerVerifiedTick";

type Props = {
  dealer: DealerProfile;
  dealerType: DealerType;
  supabaseUrl: string;
};

export function BayiCard({ dealer, dealerType, supabaseUrl }: Props) {
  const theme = dealerTheme(dealerType);
  const coverImageUrl = resolveDealerCoverImageUrl(dealer, supabaseUrl);
  const cityName = dealer.city_name ?? "";
  const brands = parseAuthorizedBrands(dealer.authorized_brands, 3);
  const href = `/bayi/${dealerType}/${dealer.id}`;
  const expertizPrices: ExpertizPriceItem[] =
    dealerType === "expertiz" && Array.isArray(dealer.price_list)
      ? dealer.price_list.slice(0, 2)
      : [];

  return (
    <article className="group overflow-hidden rounded-2xl bg-white shadow-[0_10px_28px_-18px_rgba(0,0,0,0.45)] ring-1 ring-black/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.4)]">
      <Link href={href} className="relative block aspect-[5/4] w-full overflow-hidden bg-zinc-200">
        {coverImageUrl ? (
          // Signed storage URL — optimizer token'ı kırıyor.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImageUrl}
            alt={dealer.dealer_name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: theme.primary }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={theme.logoSrc} alt="" className="h-24 w-24 rounded-full object-cover ring-4 ring-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
          <h3 className="flex items-start gap-1 text-[15px] font-extrabold leading-snug tracking-tight">
            <span className="line-clamp-2">{dealer.dealer_name}</span>
            <DealerVerifiedTick size={14} className="mt-0.5 text-white" />
          </h3>
          {dealerType === "galeri" ? (
            <>
              {cityName ? (
                <p className="mt-1 text-xs font-medium text-white/85">{cityName}</p>
              ) : null}
              {brands.length > 0 ? (
                <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-white/70">
                  {brands.join(" · ")}
                </p>
              ) : null}
            </>
          ) : (
            <>
              {cityName ? (
                <p className="mt-1 text-xs font-medium text-white/85">{cityName}</p>
              ) : null}
              {expertizPrices.length > 0 ? (
                <p className="mt-1 text-[11px] font-semibold text-white/80">
                  {expertizPrices
                    .map((item) => `${item.service} ₺${item.price.toLocaleString("tr-TR")}`)
                    .join(" · ")}
                </p>
              ) : null}
            </>
          )}
        </div>
      </Link>
    </article>
  );
}
