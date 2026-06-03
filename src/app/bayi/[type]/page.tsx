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

type Props = {
  params: Promise<{ type: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  const dealerType = type as DealerType;

  if (!DEALER_TYPES.includes(dealerType)) {
    return { title: "Bayi Bulunamadı" };
  }

  const title = `${DEALER_TYPE_LABELS[dealerType]} Bayileri`;
  const description = DEALER_TYPE_DESCRIPTIONS[dealerType];

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Oto Pazarı`,
      description,
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
  const dealerType = type as DealerType;

  if (!DEALER_TYPES.includes(dealerType)) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch data
  const [dealers, cities, userApplication] = await Promise.all([
    fetchPublicDealers(supabase, dealerType, {
      limit: 50,
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

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">
              {DEALER_TYPE_LABELS[dealerType]} Bayileri
            </h1>
            <p className="mt-2 text-zinc-600">
              {DEALER_TYPE_DESCRIPTIONS[dealerType]}
            </p>
          </div>
          {!userApplication ? (
            <Link
              href={`/bayi/basvuru?type=${dealerType}`}
              className="rounded-lg bg-[#ffc400] px-6 py-3 font-bold text-black transition hover:bg-[#ffd24d]"
            >
              Bayi Başvurusu Yap
            </Link>
          ) : userDealerState === "active" ? (
            <Link
              href={`/bayi/panel/${dealerType}`}
              className="rounded-lg bg-green-600 px-6 py-3 font-bold text-white transition hover:bg-green-700"
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
              className="rounded-lg bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700"
            >
              Ödeme Yap & Aktifleştir
            </Link>
          ) : null}
        </div>
      </div>

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

      {/* Filters */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Bayi ara..."
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-[#ffc400] focus:outline-none focus:ring-2 focus:ring-[#ffc400]/20"
            />
          </div>
          <select className="rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-[#ffc400] focus:outline-none focus:ring-2 focus:ring-[#ffc400]/20">
            <option value="">Tüm şehirler</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
          <select className="rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-[#ffc400] focus:outline-none focus:ring-2 focus:ring-[#ffc400]/20">
            <option value="">Sıralama</option>
            <option value="newest">En yeni</option>
            <option value="name_asc">İsim (A-Z)</option>
            <option value="name_desc">İsim (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Dealers Grid */}
      {dealers.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {dealers.map((dealer) => (
            <BayiCard
              key={dealer.id}
              dealer={dealer}
              dealerType={dealerType}
              supabaseUrl={env.supabaseUrl}
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
  );
}
