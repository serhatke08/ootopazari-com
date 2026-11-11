import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import {
  fetchUserDealerApplication,
  fetchPublicDealers,
  fetchDealerAnalytics,
  fetchDealerListings,
} from "@/lib/bayi-data";
import { fetchCities } from "@/lib/listings-data";
import { fetchListingQuota } from "@/lib/listing-quota";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getDealerProfileTable } from "@/lib/dealer-listing-tables";
import { BayiOwnerPanel } from "@/components/BayiOwnerPanel";
import { BayiCard } from "@/components/BayiCard";
import {
  DEALER_TYPES,
  DEALER_TYPE_LABELS,
  type DealerType,
} from "@/lib/bayi-types";
import { normalizeDealerState } from "@/lib/bayi-application-status";

type Props = {
  params: Promise<{ type: string }>;
};

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export function generateStaticParams() {
  return DEALER_TYPES.map((type) => ({ type }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  const dealerType = type as DealerType;

  if (!DEALER_TYPES.includes(dealerType)) {
    return { title: "Bayi Paneli" };
  }

  return {
    title: `${DEALER_TYPE_LABELS[dealerType]} Bayi Paneli`,
    robots: { index: false, follow: false },
  };
}

export default async function BayiPanelPage({ params }: Props) {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const { type } = await params;
  const dealerType = type as DealerType;

  if (!DEALER_TYPES.includes(dealerType)) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/giris?next=${encodeURIComponent(`/bayi/panel/${dealerType}`)}`);
  }

  // Fetch user's application
  const application = await fetchUserDealerApplication(
    supabase,
    user.id,
    dealerType
  );

  if (!application) {
    // No application, redirect to application form
    redirect(`/bayi/basvuru?type=${dealerType}`);
  }

  // Check application state
  const dealerState = normalizeDealerState(
    application.status,
    application.payment_status,
    application.membership_expires_at
  );

  if (dealerState === "pending") {
    // Application pending, show waiting message
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-200">
            <svg
              className="h-8 w-8 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-amber-900">
            Başvurunuz İnceleniyor
          </h1>
          <p className="mt-2 text-amber-800">
            {DEALER_TYPE_LABELS[dealerType]} bayiliği başvurunuz ekibimiz tarafından
            inceleniyor. Onaylandığında e-posta ile bilgilendirileceksiniz.
          </p>
          <div className="mt-6">
            <Link
              href={`/bayi/${dealerType}`}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 font-bold text-white transition hover:bg-amber-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Geri Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (dealerState === "rejected") {
    // Application rejected
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <div className="rounded-xl border-2 border-red-300 bg-red-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-200">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-900">Başvurunuz Reddedildi</h1>
          <p className="mt-2 text-red-800">
            Üzgünüz, {DEALER_TYPE_LABELS[dealerType]} bayiliği başvurunuz
            onaylanmadı.
          </p>
          <div className="mt-6">
            <Link
              href={`/bayi/${dealerType}`}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Geri Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const quotaClient = createSupabaseServiceClient() ?? supabase;
  const profileTable = getDealerProfileTable(dealerType);
  const { data: ownProfile } = profileTable
    ? await supabase
        .from(profileTable)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const [dealers, cities, analytics, listings, quota] = await Promise.all([
    fetchPublicDealers(supabase, dealerType, { limit: 20 }),
    fetchCities(supabase),
    fetchDealerAnalytics(supabase, dealerType, user.id),
    ownProfile?.id
      ? fetchDealerListings(supabase, dealerType, String(ownProfile.id), {
          limit: 40,
        })
      : Promise.resolve([]),
    fetchListingQuota(quotaClient, user.id),
  ]);

  const cityOptions = cities
    .filter((city) => city.id && city.name)
    .map((city) => ({ id: String(city.id), name: String(city.name) }));

  return (
    <BayiOwnerPanel
      dealerType={dealerType}
      application={application}
      cities={cityOptions}
      listings={(listings as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id ?? ""),
        title: (row.title as string | null) ?? null,
        price: typeof row.price === "number" ? row.price : null,
        created_at: (row.created_at as string | null) ?? null,
        image_url: (row.image_url as string | null) ?? null,
      }))}
      analytics={analytics}
      quota={quota}
    >
      <div>
        <h2 className="mb-1 text-2xl font-black tracking-tight text-zinc-900">
          Sektör vitrini
        </h2>
        <p className="mb-5 text-sm text-zinc-600">
          Sadece ödemesi tamamlanmış, aktif {DEALER_TYPE_LABELS[dealerType].toLowerCase()} bayileri.
        </p>

        {dealers.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2">
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
              Henüz {DEALER_TYPE_LABELS[dealerType].toLowerCase()} bayisi
              bulunmuyor.
            </p>
          </div>
        )}
      </div>
    </BayiOwnerPanel>
  );
}
