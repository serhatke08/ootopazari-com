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
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-zinc-50 to-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
                İlan sahipleri
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-950 sm:text-4xl">
                İlanını öne çıkar
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-base">
                Ana sayfada görünürlüğünü artır. Günde 24 saatlik pulse ile
                ilanın öne taşınır; ek paketler mevcut sürenin üzerine eklenir.
              </p>
            </div>
            <Link
              href="/profil/odemeler"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
            >
              Ödeme geçmişi
            </Link>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: "⚡", text: "Ana sayfada öne çıkar" },
              { icon: "📅", text: "Günlük 24 saat pulse" },
              { icon: "➕", text: "Süre üstüne eklenir" },
            ].map((item) => (
              <li
                key={item.text}
                className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white/80 px-4 py-3 text-sm font-medium text-zinc-800 backdrop-blur-sm"
              >
                <span className="text-lg" aria-hidden>
                  {item.icon}
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </header>

        <FeatureBoostCheckout
          listings={listings}
          initialListingNumber={listingParam?.trim() || null}
          paymentInfoByListing={paymentInfoByListing}
        />

        <p className="mt-10 text-center text-xs leading-relaxed text-zinc-500">
          Fiyatlara KDV dahildir. Dijital hizmet; fiziksel ürün gönderimi yoktur.{" "}
          <Link href="/iade-iptal-politikasi" className="underline">
            İade politikası
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
