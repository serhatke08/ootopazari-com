import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FeatureBoostCheckout } from "@/components/FeatureBoostCheckout";
import { tryGetSupabaseEnv } from "@/lib/env";
import { buildFeatureBoostListingOption } from "@/lib/feature-boost-listing";
import { fetchBoostPaymentInfoByListing } from "@/lib/feature-boost-payment-status";
import { enrichListingRowsCoverImages } from "@/lib/listing-images";
import { fetchListingsForUser } from "@/lib/listings-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "İlan Öne Çıkarma",
  description:
    "Oto Pazarı ilan öne çıkarma paketleri, fiyatları ve ödeme koşulları.",
  alternates: {
    canonical: "/ilan-one-cikar",
  },
};

type Props = {
  searchParams: Promise<{ listing?: string }>;
};

export default async function IlanOneCikarPage({ searchParams }: Props) {
  const env = tryGetSupabaseEnv();
  if (!env) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/giris?next=${encodeURIComponent("/ilan-one-cikar")}`);
  }

  const { listing: listingParam } = await searchParams;
  const rows = await fetchListingsForUser(supabase, user.id);
  await enrichListingRowsCoverImages(supabase, env, rows);

  const listings = rows
    .map((row) =>
      buildFeatureBoostListingOption(
        row,
        row.image_url != null ? String(row.image_url) : null
      )
    )
    .filter((item): item is NonNullable<typeof item> => item != null);

  const listingIds = listings.map((l) => l.id);
  const paymentMap = await fetchBoostPaymentInfoByListing(
    supabase,
    user.id,
    listingIds
  );
  const paymentInfoByListing = Object.fromEntries(paymentMap.entries());

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-6 sm:py-8">
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:mb-6">
          <div>
            <h1 className="text-xl font-black tracking-tight text-zinc-950 sm:text-3xl">
              İlanını öne çıkar
            </h1>
            <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
              Ana sayfada görün · Günlük pulse · Süre üstüne eklenir
            </p>
          </div>
          <Link
            href="/profil/odemeler"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 sm:text-sm"
          >
            Ödeme geçmişi
          </Link>
        </header>

        <FeatureBoostCheckout
          listings={listings}
          initialListingNumber={listingParam?.trim() || null}
          paymentInfoByListing={paymentInfoByListing}
        />

        <p className="mt-8 text-center text-[10px] leading-relaxed text-zinc-400 sm:text-xs">
          KDV dahil · Dijital hizmet{" "}
          <Link href="/iade-iptal-politikasi" className="underline">
            İade
          </Link>
          {" · "}
          <Link href="/mesafeli-satis-sozlesmesi" className="underline">
            Mesafeli satış
          </Link>
        </p>
      </div>
    </div>
  );
}
