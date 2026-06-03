import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import { fetchDealerProfile, resolveDealerCoverImageUrl } from "@/lib/bayi-data";
import {
  DEALER_TYPES,
  DEALER_TYPE_LABELS,
  type DealerType,
  type ExpertizPriceItem,
} from "@/lib/bayi-types";

type Props = {
  params: Promise<{ type: string; id: string }>;
};

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

  const coverImageUrl = resolveDealerCoverImageUrl(dealer, env.supabaseUrl);
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

      {/* Cover Image */}
      <div className="relative mb-6 aspect-[21/9] w-full overflow-hidden rounded-2xl bg-zinc-100">
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={dealer.dealer_name}
            fill
            className="object-cover"
            sizes="(max-width: 1536px) 100vw, 1536px"
            priority
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
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="mb-3 flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold text-zinc-900">
                {dealer.dealer_name}
              </h1>
              {/* Doğrulama Rozeti */}
              <span
                className="shrink-0 rounded-full bg-blue-100 p-2"
                title="Doğrulanmış bayi"
              >
                <svg
                  className="h-6 w-6 text-blue-600"
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
