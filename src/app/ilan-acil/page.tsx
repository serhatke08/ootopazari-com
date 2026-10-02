import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AcilCheckoutClient } from "@/components/AcilCheckoutClient";
import { tryGetSupabaseEnv } from "@/lib/env";
import { enrichListingRowsCoverImages } from "@/lib/listing-images";
import { fetchListingsForUser } from "@/lib/listings-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Acil İlan Paketi",
  description: "Acil vitrin paketleri ve fiyatları.",
  alternates: { canonical: "/ilan-acil" },
};

type Props = {
  searchParams: Promise<{ listing?: string }>;
};

export default async function IlanAcilPage({ searchParams }: Props) {
  const env = tryGetSupabaseEnv();
  if (!env) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/giris?next=${encodeURIComponent("/ilan-acil")}`);
  }

  const { listing: listingParam } = await searchParams;
  const rows = await fetchListingsForUser(supabase, user.id);
  await enrichListingRowsCoverImages(supabase, env, rows);

  const listings = rows.map((row) => ({
    id: String(row.id ?? ""),
    listingNumber:
      row.listing_number != null ? String(row.listing_number) : "",
    title: String(row.title ?? "İlan"),
    coverImageUrl: row.image_url != null ? String(row.image_url) : null,
    price: row.price != null ? Number(row.price) : null,
  }));

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto w-full max-w-lg px-3 py-5 sm:px-6 sm:py-8">
        <header className="mb-5">
          <h1 className="text-xl font-black tracking-tight text-zinc-950 sm:text-2xl">
            Acil ilan paketi
          </h1>
          <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
            Acil vitrinde öne çık · Paket süresi bitince otomatik düşer
          </p>
        </header>

        <AcilCheckoutClient
          listings={listings}
          initialListingKey={listingParam?.trim() || null}
        />

        <p className="mt-8 text-center text-xs text-zinc-500">
          <Link href="/profil/ilanlarim" className="font-semibold underline">
            İlanlarıma dön
          </Link>
        </p>
      </div>
    </div>
  );
}
