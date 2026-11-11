import Link from "next/link";
import type { DealerProfile, DealerType, ExpertizPriceItem } from "@/lib/bayi-types";
import { resolveDealerCoverImageUrl } from "@/lib/bayi-data";
import { dealerTheme, parseAuthorizedBrands } from "@/lib/dealer-theme";

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
        <span
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-blue-600 shadow"
          title="Doğrulanmış bayi"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
          <h3 className="line-clamp-2 text-[15px] font-extrabold leading-snug tracking-tight">
            {dealer.dealer_name}
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
