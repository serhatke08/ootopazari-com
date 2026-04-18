import { notFound, redirect } from "next/navigation";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import { CreateListingWizard } from "@/components/ilan-ver/CreateListingWizard";
import { collectListingGalleryUrls } from "@/lib/listing-images";
import {
  fetchCategories,
  fetchListingForOwnerByNumber,
} from "@/lib/listings-data";

type Props = { params: Promise<{ listingNumber: string }> };

export default async function IlanDuzenlePage({ params }: Props) {
  const { listingNumber } = await params;
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
    redirect(
      `/giris?next=${encodeURIComponent(`/ilan-duzenle/${listingNumber}`)}`
    );
  }

  const row = await fetchListingForOwnerByNumber(
    supabase,
    listingNumber,
    user.id
  );
  if (!row) notFound();

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

  const initialGalleryUrls = collectListingGalleryUrls(
    env,
    row as Record<string, unknown>,
    row.image_url as string | null
  );

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <CreateListingWizard
        categories={listingCategories}
        userCountryId={userCountryId}
        editListingId={row.id as string}
        editListingNumber={String(row.listing_number ?? listingNumber)}
        initialGalleryUrls={initialGalleryUrls}
        initialListingPayload={row as Record<string, unknown>}
      />
    </div>
  );
}
