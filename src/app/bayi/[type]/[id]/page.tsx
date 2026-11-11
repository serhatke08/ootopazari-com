import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import {
  fetchDealerProfile,
  resolveDealerCoverImageUrl,
  resolveDealerLogoImageUrl,
} from "@/lib/bayi-data";
import {
  DEALER_TYPES,
  DEALER_TYPE_LABELS,
  type DealerType,
  type ExpertizPriceItem,
} from "@/lib/bayi-types";
import { DealerVerifiedTick } from "@/components/bayi/DealerVerifiedTick";
import { dealerTheme } from "@/lib/dealer-theme";

type Props = {
  params: Promise<{ type: string; id: string }>;
};

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type, id } = await params;
  const dealerType = type as DealerType;

  if (!DEALER_TYPES.includes(dealerType)) {
    return { title: "Bayi Bulunamadı" };
  }

  const env = tryGetSupabaseEnv();
  if (!env) {
    return { title: "Bayi Detay" };
  }

  const supabase = await createSupabaseServerClient();
  const dealer = await fetchDealerProfile(supabase, dealerType, id);

  if (!dealer) {
    return { title: "Bayi Bulunamadı" };
  }

  return {
    title: `${dealer.dealer_name} | ${DEALER_TYPE_LABELS[dealerType]}`,
    description: dealer.description || `${dealer.dealer_name} - ${DEALER_TYPE_LABELS[dealerType]}`,
    openGraph: {
      title: dealer.dealer_name,
      description: dealer.description || undefined,
    },
  };
}

export default async function BayiDetailPage({ params }: Props) {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const { type, id } = await params;
  const dealerType = type as DealerType;

  if (!DEALER_TYPES.includes(dealerType)) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const dealer = await fetchDealerProfile(supabase, dealerType, id);

  if (!dealer) {
    notFound();
  }

  const coverImageUrl = resolveDealerCoverImageUrl(dealer, env.url);
  const logoImageUrl = resolveDealerLogoImageUrl(dealer, env.url);
  const theme = dealerTheme(dealerType);
  const cityName = dealer.city_name ?? "Türkiye";

  // Expertiz price list
  const priceList: ExpertizPriceItem[] = [];
  if (dealerType === "expertiz" && dealer.price_list && Array.isArray(dealer.price_list)) {
    priceList.push(...dealer.price_list);
  }

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
      {/* Back Button */}
      <Link
        href={`/bayi/${dealerType}`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        {DEALER_TYPE_LABELS[dealerType]} Bayilerine Dön
      </Link>

      <div className="relative mb-2 overflow-hidden rounded-2xl bg-zinc-100 lg:rounded-3xl">
        <div className="relative h-[200px] w-full sm:h-[260px] lg:h-[360px] xl:h-[400px]">
          {coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImageUrl}
              alt={dealer.dealer_name}
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400">
              <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
        </div>
      </div>

      <div className="relative z-10 -mt-10 mb-6 flex items-end gap-4 px-1 sm:-mt-12 lg:-mt-14">
        <div
          className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-full bg-white shadow-lg ring-[3px] ring-white sm:h-[88px] sm:w-[88px] lg:h-[96px] lg:w-[96px]"
          title="Tabela"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoImageUrl || theme.logoSrc}
            alt={`${dealer.dealer_name} tabela`}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 pb-0.5 pt-10 sm:pt-12">
          <h1 className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            <span>{dealer.dealer_name}</span>
            <DealerVerifiedTick size={18} className="translate-y-[1px]" />
          </h1>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffc400] px-3 py-1 text-sm font-semibold text-black">
                {DEALER_TYPE_LABELS[dealerType]}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-zinc-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                {cityName}
              </span>
            </div>
          </div>

          {/* Description */}
          {dealer.description ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-3 text-lg font-bold text-zinc-900">Hakkında</h2>
              <p className="whitespace-pre-line text-zinc-700">
                {dealer.description}
              </p>
            </div>
          ) : null}

          {/* Expertiz Price List */}
          {priceList.length > 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-bold text-zinc-900">Fiyat Listesi</h2>
              <div className="space-y-3">
                {priceList.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-900">{item.service}</p>
                      {item.description ? (
                        <p className="mt-1 text-sm text-zinc-600">{item.description}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-lg font-bold tabular-nums text-[#ffc400]">
                      ₺{item.price.toLocaleString("tr-TR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-bold text-zinc-900">İletişim</h3>
            <div className="space-y-3">
              {dealer.contact_phone ? (
                <a
                  href={`tel:${dealer.contact_phone}`}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 transition hover:border-[#ffc400] hover:bg-[#fffbf0]"
                >
                  <svg
                    className="h-5 w-5 shrink-0 text-[#ffc400]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <span className="font-semibold text-zinc-900">
                    {dealer.contact_phone}
                  </span>
                </a>
              ) : (
                <p className="text-sm text-zinc-500">Telefon bilgisi yok</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
