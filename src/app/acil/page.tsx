import type { Metadata } from "next";
import { MissingEnv } from "@/components/MissingEnv";
import { SpecialListingsPageView } from "@/components/SpecialListingsPageView";
import { tryGetSupabaseEnv } from "@/lib/env";
import { fetchSpecialListingsFeed } from "@/lib/special-listings-feed";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Acil",
  description: "Acil ilanları inceleyin.",
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
