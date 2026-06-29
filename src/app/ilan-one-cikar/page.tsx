import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FeatureBoostCheckout } from "@/components/FeatureBoostCheckout";
import { tryGetSupabaseEnv } from "@/lib/env";
import { buildFeatureBoostListingOption } from "@/lib/feature-boost-listing";
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="text-sm font-bold uppercase tracking-wide text-amber-600">
          İlan sahipleri için
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
          İlanını öne çıkar
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
          Bir veya birden fazla ilan seçin, paket belirleyin, PayTR ile ödeme
          yapın. Aktif öne çıkarmaya alınan paket süreyi üstüne ekler.
        </p>
      </header>

      <FeatureBoostCheckout
        listings={listings}
        initialListingNumber={listingParam?.trim() || null}
      />

      <p className="mt-8 text-center text-xs leading-5 text-zinc-500">
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
  );
}
