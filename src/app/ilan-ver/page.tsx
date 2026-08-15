import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import { fetchCategories } from "@/lib/listings-data";
import { CreateListingWizard } from "@/components/ilan-ver/CreateListingWizard";
import { expireDueListings, fetchListingQuota } from "@/lib/listing-quota";

export const metadata: Metadata = {
  title: "İlan Ver",
  robots: { index: false, follow: false },
};

export default async function IlanVerPage() {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/giris?next=${encodeURIComponent("/ilan-ver")}`);
  }

  await expireDueListings(supabase, { userId: user.id });

  const [categories, profileRes, quota] = await Promise.all([
    fetchCategories(supabase),
    supabase
      .from("profiles")
      .select("id,full_name,username,phone,country_id")
      .eq("id", user.id)
      .maybeSingle(),
    fetchListingQuota(supabase, user.id),
  ]);

  const profile = profileRes.data as {
    id?: string | null;
    full_name?: string | null;
    username?: string | null;
    phone?: string | null;
    country_id?: string | null;
  } | null;
  const profileComplete = Boolean(
    profile?.id &&
      profile.full_name?.trim() &&
      profile.username?.trim() &&
      profile.phone?.trim() &&
      profile.country_id
  );
  if (!profileComplete) {
    redirect(`/hesap-tamamla?next=${encodeURIComponent("/ilan-ver")}`);
  }

  const userCountryId =
    profile?.country_id != null ? String(profile.country_id) : null;

  const listingCategories = categories.filter(
    (c) => String(c.code ?? "").toLowerCase() !== "all"
  );

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <CreateListingWizard
        categories={listingCategories}
        userCountryId={userCountryId}
        listingQuota={quota}
      />
    </div>
  );
}
