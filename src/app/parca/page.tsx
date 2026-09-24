import type { Metadata } from "next";
import Link from "next/link";
import { MissingEnv } from "@/components/MissingEnv";
import { ParcaciPartCard } from "@/components/ParcaciPartCard";
import { SeoHubContent } from "@/components/SeoHubContent";
import { tryGetSupabaseEnv } from "@/lib/env";
import { fetchPublicParcaciListings } from "@/lib/parcaci-listings";
import { getSeoHubBySlug } from "@/lib/seo-hubs";
import { SITE_DISPLAY_NAME } from "@/lib/seo-brand";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const hub = getSeoHubBySlug("oto-yedek-parca")!;

export const metadata: Metadata = {
  title: hub.title,
  description: hub.description,
  alternates: { canonical: hub.path },
  openGraph: {
    title: `${hub.title} | ${SITE_DISPLAY_NAME}`,
    description: hub.description,
    url: hub.path,
    type: "website",
  },
};

export default async function ParcaHomePage() {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const items = await fetchPublicParcaciListings(supabase, 30);

  return (
    <SeoHubContent hub={hub}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-zinc-900 sm:text-xl">
          Güncel parça ilanları
        </h2>
        <span className="text-xs font-semibold text-zinc-500">
          {items.length} ilan
        </span>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600">
          Henüz yayında parça ilanı yok.{" "}
          <Link href="/bayi/parcaci" className="font-semibold underline">
            Parçacı bayileri
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => (
            <ParcaciPartCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </SeoHubContent>
  );
}
