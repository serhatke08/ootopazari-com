import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import {
  fetchDealerListings,
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
import { dealerTheme, parseAuthorizedBrands } from "@/lib/dealer-theme";

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

  const listings = await fetchDealerListings(supabase, dealerType, dealer.id, {
    limit: 12,
  });
  const coverImageUrl = resolveDealerCoverImageUrl(dealer, env.url);
  const logoImageUrl = resolveDealerLogoImageUrl(dealer, env.url);
  const theme = dealerTheme(dealerType);
  const cityName = dealer.city_name ?? "Türkiye";
  const brands = parseAuthorizedBrands(dealer.authorized_brands, 12);
  const hours = dealer.working_hours?.trim() ?? "";
  const whatsapp = dealer.whatsapp_phone?.replace(/\D/g, "") ?? "";
  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp.startsWith("90") ? whatsapp : whatsapp.replace(/^0/, "90")}`
    : "";
  const contactName = [dealer.first_name, dealer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

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
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold"
                style={{ backgroundColor: `${theme.primary}18`, color: theme.primaryDark }}
              >
                {DEALER_TYPE_LABELS[dealerType]}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-zinc-600">
                {cityName}
              </span>
              {listings.length > 0 ? (
                <span className="text-sm font-semibold text-zinc-700">
                  {listings.length}
                  {dealerType === "kiralama" || dealerType === "galeri"
                    ? " araç"
                    : " ilan"}
                </span>
              ) : null}
            </div>
            {dealerType === "galeri" && brands.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {brands.map((brand) => (
                  <span
                    key={brand}
                    className="rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ backgroundColor: `${theme.primary}14`, color: theme.primary }}
                  >
                    {brand}
                  </span>
                ))}
              </div>
            ) : null}
            {hours ? (
              <p className="mt-3 text-sm font-medium text-zinc-700">{hours}</p>
            ) : null}
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
          {listings.length > 0 && dealerType !== "expertiz" ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-bold text-zinc-900">
                {dealerType === "kiralama" || dealerType === "galeri"
                  ? "Araçlar"
                  : "İlanlar"}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {listings.map((item) => {
                  const row = item as {
                    id?: string;
                    title?: string;
                    price?: number | null;
                    image_url?: string | null;
                  };
                  return (
                    <div
                      key={String(row.id ?? row.title)}
                      className="overflow-hidden rounded-xl border border-zinc-200"
                    >
                      <div className="h-28 bg-zinc-100">
                        {row.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-1 text-sm font-bold text-zinc-900">
                          {row.title || "İlan"}
                        </p>
                        {row.price != null ? (
                          <p
                            className="mt-1 text-sm font-extrabold"
                            style={{ color: theme.primary }}
                          >
                            ₺{Number(row.price).toLocaleString("tr-TR")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

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
              {contactName ? (
                <p className="text-sm font-semibold text-zinc-900">{contactName}</p>
              ) : null}
              {dealer.contact_phone ? (
                <a
                  href={`tel:${dealer.contact_phone}`}
                  className="flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-bold"
                  style={{
                    borderColor: `${theme.primary}59`,
                    color: theme.primaryDark,
                  }}
                >
                  {dealer.contact_phone}
                </a>
              ) : (
                <p className="text-sm text-zinc-500">Telefon bilgisi yok</p>
              )}
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center rounded-lg bg-[#128C7E] px-3 py-3 text-sm font-bold text-white"
                >
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
