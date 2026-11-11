import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import { fetchCities } from "@/lib/listings-data";
import { fetchPublicDealers, fetchUserDealerApplication } from "@/lib/bayi-data";
import { BayiCard } from "@/components/BayiCard";
import {
  DEALER_TYPES,
  DEALER_TYPE_LABELS,
  DEALER_TYPE_DESCRIPTIONS,
  type DealerType,
} from "@/lib/bayi-types";
import { normalizeDealerState } from "@/lib/bayi-application-status";
import { getSeoHubByPath } from "@/lib/seo-hubs";
import { dealerTheme } from "@/lib/dealer-theme";

type Props = {
  params: Promise<{ type: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export function generateStaticParams() {
  return DEALER_TYPES.map((type) => ({ type }));
}

function parseDealerType(type: string): DealerType | null {
  return DEALER_TYPES.includes(type as DealerType)
    ? (type as DealerType)
    : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  const dealerType = parseDealerType(type);

  if (!dealerType) {
    return { title: "Bayi Bulunamadı" };
  }

  const path = `/bayi/${dealerType}`;
  const hub = getSeoHubByPath(path);
  const title = hub?.title ?? `${DEALER_TYPE_LABELS[dealerType]} Bayileri`;
  const description =
    hub?.description ?? DEALER_TYPE_DESCRIPTIONS[dealerType];

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | Oto Pazarı`,
      description,
      url: path,
      type: "website",
    },
  };
}

export default async function BayiTypePage({ params, searchParams }: Props) {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const { type } = await params;
  const sp = await searchParams;
  const dealerType = parseDealerType(type);

  if (!dealerType) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const cityId = typeof sp.city === "string" ? sp.city : "";
  const sortBy =
    sp.sort === "name_asc" || sp.sort === "name_desc" || sp.sort === "newest"
      ? sp.sort
      : "newest";

  const [dealers, cities, userApplication] = await Promise.all([
    fetchPublicDealers(supabase, dealerType, {
      limit: 80,
      searchQuery: q || undefined,
      cityId: cityId || undefined,
      sortBy,
    }),
    fetchCities(supabase),
    user ? fetchUserDealerApplication(supabase, user.id, dealerType) : null,
  ]);

  // Application success message
  const showSuccessMessage = sp.application_success === "1";

  // User dealer state
  const userDealerState = userApplication
    ? normalizeDealerState(
        userApplication.status,
        userApplication.payment_status,
        userApplication.membership_expires_at
      )
    : null;

  const theme = dealerTheme(dealerType);

  return (
    <div className="flex-1">
      <div
        className="px-4 py-8 sm:px-6"
        style={{
          background: `linear-gradient(160deg, ${theme.primary} 0%, ${theme.primaryDark} 100%)`,
        }}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {theme.logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={theme.logoSrc}
                alt=""
                className="h-16 w-16 rounded-full object-cover ring-4 ring-white/25"
              />
            ) : (
              <span className="h-16 w-16 rounded-full bg-white/15 ring-4 ring-white/25" />
            )}
            <div>
              <h1 className="text-3xl font-black uppercase tracking-wide text-white">
                {DEALER_TYPE_LABELS[dealerType]}
              </h1>
              <p className="mt-1 max-w-xl text-sm text-white/80">
                {DEALER_TYPE_DESCRIPTIONS[dealerType]}
              </p>
            </div>
          </div>
          {!userApplication ? (
            <Link
              href={`/bayi/basvuru?type=${dealerType}`}
              className="rounded-full bg-white px-6 py-3 font-black text-zinc-900 shadow-sm"
            >
              Bayi Başvurusu Yap
            </Link>
          ) : userDealerState === "active" ? (
            <Link
              href={`/bayi/panel/${dealerType}`}
              className="rounded-full bg-white px-6 py-3 font-black text-zinc-900 shadow-sm"
            >
              Bayi Panelim
            </Link>
          ) : userDealerState === "pending" ? (
            <div className="rounded-lg border-2 border-amber-300 bg-amber-50 px-6 py-3 text-center">
              <p className="text-sm font-semibold text-amber-900">
                Başvurunuz inceleniyor
              </p>
            </div>
          ) : userDealerState === "approved_awaiting_payment" ? (
            <Link
              href={`/bayi/panel/${dealerType}`}
              className="rounded-full bg-white px-6 py-3 font-black text-zinc-900 shadow-sm"
            >
              500 TL öde & paneli aç
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      {/* Success Message */}
      {showSuccessMessage ? (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="font-semibold text-green-900">
            ✓ Başvurunuz başarıyla gönderildi!
          </p>
          <p className="mt-1 text-sm text-green-800">
            Başvurunuz incelendikten sonra e-posta ile bilgilendirileceksiniz.
          </p>
        </div>
      ) : null}

      <form
        className="mb-6 rounded-xl border border-zinc-200 bg-white p-4"
        method="get"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[180px] flex-1">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Bayi ara..."
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-[#ffc400] focus:outline-none focus:ring-2 focus:ring-[#ffc400]/20"
            />
          </div>
          <select
            name="city"
            defaultValue={cityId}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-[#ffc400] focus:outline-none focus:ring-2 focus:ring-[#ffc400]/20"
          >
            <option value="">Tüm şehirler</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
          <select
            name="sort"
            defaultValue={sortBy}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-[#ffc400] focus:outline-none focus:ring-2 focus:ring-[#ffc400]/20"
          >
            <option value="newest">En yeni</option>
            <option value="name_asc">İsim (A-Z)</option>
            <option value="name_desc">İsim (Z-A)</option>
          </select>
          <button
            type="submit"
            className="rounded-lg px-4 py-2 text-sm font-bold text-white"
            style={{ backgroundColor: theme.primary }}
          >
            Filtrele
          </button>
        </div>
      </form>

      {dealers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dealers.map((dealer) => (
            <BayiCard
              key={dealer.id}
              dealer={dealer}
              dealerType={dealerType}
              supabaseUrl={env.url}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-12 text-center">
          <p className="text-zinc-600">
            Henüz {DEALER_TYPE_LABELS[dealerType].toLowerCase()} bayisi bulunmuyor.
          </p>
          {!userApplication ? (
            <Link
              href={`/bayi/basvuru?type=${dealerType}`}
              className="mt-4 inline-block rounded-lg bg-[#ffc400] px-6 py-3 font-bold text-black transition hover:bg-[#ffd24d]"
            >
              İlk Bayi Siz Olun
            </Link>
          ) : null}
        </div>
      )}
      </div>
    </div>
  );
}
