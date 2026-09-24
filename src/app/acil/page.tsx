import type { Metadata } from "next";
import { MissingEnv } from "@/components/MissingEnv";
import { SpecialListingsPageView } from "@/components/SpecialListingsPageView";
import { tryGetSupabaseEnv } from "@/lib/env";
import { fetchSpecialListingsFeed } from "@/lib/special-listings-feed";
import { SITE_DISPLAY_NAME } from "@/lib/seo-brand";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Acil Araç İlanları",
  description:
    "Oto Pazarı'nda acil satılık araç ilanları. Hızlı satış için öne çıkan ikinci el araba ilanlarını inceleyin.",
  alternates: { canonical: "/acil" },
  openGraph: {
    title: `Acil Araç İlanları | ${SITE_DISPLAY_NAME}`,
    description:
      "Acil satılık araç ilanları — Oto Pazarı'nda güncel acil vitrin.",
    url: "/acil",
    type: "website",
  },
};

export default async function AcilPage() {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { items, loggedIn } = await fetchSpecialListingsFeed(
    supabase,
    env,
    "acil"
  );

  return (
    <SpecialListingsPageView
      kind="acil"
      items={items}
      env={env}
      loggedIn={loggedIn}
    />
  );
}
