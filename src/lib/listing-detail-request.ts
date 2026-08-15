import { cache } from "react";
import { tryGetSupabaseEnv, type SupabasePublicEnv } from "@/lib/env";
import {
  fetchAdminProfileByUserId,
  type AdminProfileRow,
} from "@/lib/admin-profile";
import {
  fetchListingForDetailPage,
  type ListingDetailAccessMode,
  type ListingRow,
} from "@/lib/listings-data";
import { expireDueListings } from "@/lib/listing-quota";
import { extractListingNumberFromSeoParam } from "@/lib/listing-seo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ListingDetailRequest = {
  listingParam: string;
  listingNumber: string;
  env: SupabasePublicEnv | null;
  supabase: SupabaseClient | null;
  viewer: User | null;
  viewerAdmin: AdminProfileRow | null;
  detail: { listing: ListingRow; access: ListingDetailAccessMode } | null;
};

/**
 * generateMetadata ve sayfa gövdesi aynı isteği iki kez atmasın diye
 * React `cache` ile tekilleştirilir.
 */
export const loadListingDetailRequest = cache(
  async (listingParam: string): Promise<ListingDetailRequest> => {
    const listingNumber =
      extractListingNumberFromSeoParam(listingParam) ?? listingParam;
    const env = tryGetSupabaseEnv();
    if (!env) {
      return {
        listingParam,
        listingNumber,
        env: null,
        supabase: null,
        viewer: null,
        viewerAdmin: null,
        detail: null,
      };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user: viewer },
    } = await supabase.auth.getUser();
    const viewerAdmin = viewer?.id
      ? await fetchAdminProfileByUserId(supabase, viewer.id)
      : null;
    if (viewer?.id) {
      await expireDueListings(supabase, { userId: viewer.id });
    }

    const detail = await fetchListingForDetailPage(
      supabase,
      listingNumber,
      viewer?.id ?? null,
      { viewerIsAdmin: !!viewerAdmin }
    );

    return {
      listingParam,
      listingNumber,
      env,
      supabase,
      viewer,
      viewerAdmin,
      detail,
    };
  }
);
