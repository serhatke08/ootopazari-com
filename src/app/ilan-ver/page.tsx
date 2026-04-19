import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import { fetchCategories } from "@/lib/listings-data";
import { CreateListingWizard } from "@/components/ilan-ver/CreateListingWizard";

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

  const [categories, profileRes] = await Promise.all([
    fetchCategories(supabase),
    supabase
      .from("profiles")
      .select("country_id")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const profile = profileRes.data as { country_id?: string | null } | null;
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
      />
    </div>
  );
}
