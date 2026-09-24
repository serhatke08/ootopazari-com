import type { Metadata } from "next";
import { MissingEnv } from "@/components/MissingEnv";
import { BayiCard } from "@/components/BayiCard";
import { SeoHubContent } from "@/components/SeoHubContent";
import { fetchPublicDealers } from "@/lib/bayi-data";
import { tryGetSupabaseEnv } from "@/lib/env";
import { getSeoHubBySlug } from "@/lib/seo-hubs";
import { SITE_DISPLAY_NAME } from "@/lib/seo-brand";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const hub = getSeoHubBySlug("kiralik-arac")!;

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

export default async function KiralikAracPage() {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const dealers = await fetchPublicDealers(supabase, "kiralama", { limit: 24 });

  return (
    <SeoHubContent hub={hub}>
      <h2 className="mb-3 text-lg font-bold text-zinc-900">
        Kiralama bayileri
      </h2>
      {dealers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-600">
          Şu an listelenen kiralama bayisi yok.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dealers.map((dealer) => (
            <BayiCard
              key={dealer.id}
              dealer={dealer}
              dealerType="kiralama"
              supabaseUrl={env.url}
            />
          ))}
        </div>
      )}
    </SeoHubContent>
  );
}
