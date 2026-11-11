import Link from "next/link";
import type { DealerProfile, DealerType, ExpertizPriceItem } from "@/lib/bayi-types";
import {
  resolveDealerCoverImageUrl,
  resolveDealerLogoImageUrl,
} from "@/lib/bayi-data";
import { dealerTheme, parseAuthorizedBrands } from "@/lib/dealer-theme";
import { DealerVerifiedTick } from "@/components/bayi/DealerVerifiedTick";

type Props = {
  dealer: DealerProfile;
  dealerType: DealerType;
  supabaseUrl: string;
};

function turkishUpper(value: string) {
  return value.replaceAll("i", "İ").replaceAll("ı", "I").toLocaleUpperCase("tr-TR");
}

export function BayiCard({ dealer, dealerType, supabaseUrl }: Props) {
  const theme = dealerTheme(dealerType);
  const coverImageUrl = resolveDealerCoverImageUrl(dealer, supabaseUrl);
  const logoImageUrl = resolveDealerLogoImageUrl(dealer, supabaseUrl);
  const cityName = dealer.city_name ?? "";
  const brands = parseAuthorizedBrands(dealer.authorized_brands, 3);
  const href = `/bayi/${dealerType}/${dealer.id}`;
  const phone = dealer.contact_phone?.trim() ?? "";
  const desc = dealer.description?.trim() ?? "";
  const hours = dealer.working_hours?.trim() ?? "";
  const expertizPrices: ExpertizPriceItem[] =
    dealerType === "expertiz" && Array.isArray(dealer.price_list)
      ? dealer.price_list.slice(0, 3)
      : [];

  return (
    <article
      className="overflow-hidden rounded-[18px] bg-white shadow-[0_10px_24px_-18px_rgba(0,0,0,0.35)]"
      style={{ border: `1.4px solid ${theme.primary}8C` }}
    >
      <Link href={href} className="block">
        <div className="relative h-44 w-full overflow-hidden bg-zinc-200 sm:h-48">
          {coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImageUrl}
              alt={dealer.dealer_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ backgroundColor: `${theme.primary}1F` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoImageUrl || theme.logoSrc}
                alt=""
                className="h-16 w-16 rounded-full object-cover ring-2 ring-white/40"
              />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-x-3 bottom-3 flex items-end gap-2">
            <h3 className="min-w-0 flex-1 text-center text-[17px] font-bold tracking-wide text-white drop-shadow">
              {turkishUpper(dealer.dealer_name)}
            </h3>
            <DealerVerifiedTick size={18} className="mb-0.5 shrink-0 text-white" />
          </div>
        </div>

        <div className="px-3.5 py-3">
          {dealerType === "galeri" ? (
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                {cityName ? (
                  <p className="truncate text-[13px] font-bold text-zinc-800">
                    {cityName}
                  </p>
                ) : null}
                {brands.length > 0 ? (
                  <p
                    className="mt-0.5 truncate text-xs font-semibold"
                    style={{ color: theme.primary }}
                  >
                    {brands.join(" · ")}
                  </p>
                ) : null}
              </div>
              <span className="text-zinc-400">›</span>
            </div>
          ) : (
            <div>
              <span
                className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={{
                  backgroundColor: `${theme.primary}14`,
                  color: theme.primary,
                }}
              >
                {theme.label}
              </span>
              {cityName ? (
                <p className="mt-2 flex items-center gap-1 text-[13px] text-zinc-700">
                  <span aria-hidden>📍</span>
                  {cityName}
                </p>
              ) : null}
              {hours ? (
                <p className="mt-1 truncate text-xs font-medium text-zinc-600">
                  {hours}
                </p>
              ) : null}
              {desc && dealerType !== "expertiz" ? (
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-zinc-700">
                  {desc}
                </p>
              ) : null}
              {expertizPrices.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {expertizPrices.map((item) => (
                    <div
                      key={`${item.service}-${item.price}`}
                      className="flex items-baseline justify-between gap-3 text-[12px]"
                    >
                      <span className="truncate text-zinc-700">{item.service}</span>
                      <span
                        className="shrink-0 font-bold tabular-nums"
                        style={{ color: theme.primary }}
                      >
                        ₺{item.price.toLocaleString("tr-TR")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              {phone ? (
                <p className="mt-2.5 flex items-center justify-between text-[13px] font-semibold text-zinc-900">
                  <span>{phone}</span>
                  <span className="text-zinc-400">›</span>
                </p>
              ) : null}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
