import Image from "next/image";
import Link from "next/link";
import type { DealerProfile, DealerType, ExpertizPriceItem } from "@/lib/bayi-types";
import { resolveDealerCoverImageUrl } from "@/lib/bayi-data";

type Props = {
  dealer: DealerProfile;
  dealerType: DealerType;
  supabaseUrl: string;
};

export function BayiCard({ dealer, dealerType, supabaseUrl }: Props) {
  const coverImageUrl = resolveDealerCoverImageUrl(dealer, supabaseUrl);
  const cityName = dealer.city_name ?? "Türkiye";
  const hasPhone = dealer.contact_phone != null && dealer.contact_phone.trim() !== "";

  // Expertiz için ilk 2 fiyat kalemi
  const expertizPrices: ExpertizPriceItem[] = [];
  if (dealerType === "expertiz" && dealer.price_list && Array.isArray(dealer.price_list)) {
    expertizPrices.push(...dealer.price_list.slice(0, 2));
  }

  const href = `/bayi/${dealerType}/${dealer.id}`;

  return (
    <article className="group overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md">
      {/* Cover Image */}
      <Link href={href} className="relative block aspect-[16/9] w-full overflow-hidden bg-zinc-100">
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={dealer.dealer_name}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-400">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
        )}
      </Link>

      <div className="p-4">
        {/* Header */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <Link href={href} className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-base font-bold text-zinc-900 transition group-hover:text-[#ffc400]">
              {dealer.dealer_name}
            </h3>
          </Link>
          {/* Doğrulama Rozeti */}
          <span
            className="shrink-0 rounded-full bg-blue-100 p-1"
            title="Doğrulanmış bayi"
          >
            <svg
              className="h-4 w-4 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </div>

        {/* City */}
        <div className="mb-2 flex items-center gap-1.5 text-xs text-zinc-500">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>{cityName}</span>
        </div>

        {/* Description */}
        {dealer.description ? (
          <p className="mb-3 line-clamp-2 text-sm text-zinc-600">
            {dealer.description}
          </p>
        ) : null}

        {/* Expertiz Price Preview */}
        {expertizPrices.length > 0 ? (
          <div className="mb-3 space-y-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
            {expertizPrices.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-zinc-600">{item.service}</span>
                <span className="font-semibold tabular-nums text-zinc-900">
                  ₺{item.price.toLocaleString("tr-TR")}
                </span>
              </div>
            ))}
            {dealer.price_list && dealer.price_list.length > 2 ? (
              <p className="text-center text-[10px] text-zinc-500">
                +{dealer.price_list.length - 2} hizmet daha
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
          <Link
            href={href}
            className="text-sm font-semibold text-[#ffc400] hover:text-[#e6b000]"
          >
            Detayları Gör →
          </Link>
          {hasPhone ? (
            <span
              className="flex items-center gap-1 text-xs text-zinc-500"
              title="Telefon mevcut"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              Telefon
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
