import { SiteHeaderClient } from "@/components/SiteHeaderClient";
import { normalizeDealerState } from "@/lib/bayi-application-status";
import { tryGetSupabaseEnv } from "@/lib/env";
import {
  fetchBayiApplicationsForMenu,
  type BayiApplicationMenuRow,
} from "@/lib/bayi-applications";
import { fetchCategories, fetchProfilePublic } from "@/lib/listings-data";
import { sanitizeUserAvatarUrl } from "@/lib/oauth-avatar";
import { publicAvatarUrl } from "@/lib/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { displayNameFromAuthUser } from "@/lib/user-display-name";

export async function SiteHeader() {
  const env = tryGetSupabaseEnv();
  let email: string | null = null;
  let categories: Awaited<ReturnType<typeof fetchCategories>> = [];
  let dealerApplications: BayiApplicationMenuRow[] = [];
  let drawerProfile: { displayName: string; avatarUrl: string | null } | null =
    null;
  let hasListings = false;
  let isParcaciDealerActive = false;

  if (env) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: authResult } = await supabase.auth.getUser();
      const user = authResult.user;
      email = user?.email ?? null;

      const [cats, profile, applications] = await Promise.all([
        fetchCategories(supabase),
        user ? fetchProfilePublic(supabase, user.id) : Promise.resolve(null),
        user
          ? fetchBayiApplicationsForMenu(supabase, user.id)
          : Promise.resolve([]),
      ]);
      categories = cats;
      dealerApplications = applications;

      if (user) {
        const { count } = await supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        hasListings = (count ?? 0) > 0;

        const displayName = displayNameFromAuthUser(user, profile);
        let avatarUrl: string | null = null;
        const raw =
          sanitizeUserAvatarUrl(
            profile && typeof profile.avatar_url === "string"
              ? profile.avatar_url.trim()
              : null
          ) ?? "";
        if (raw) {
          avatarUrl = /^https?:\/\//i.test(raw)
            ? raw
            : publicAvatarUrl(env, raw.replace(/^\/+/, ""));
        }
        drawerProfile = { displayName, avatarUrl };

        const { data: parcaciApplication } = await supabase
          .from("bayi_applications")
          .select("status,payment_status,membership_expires_at")
          .eq("user_id", user.id)
          .eq("dealer_type", "parcaci")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (parcaciApplication) {
          const state = normalizeDealerState(
            parcaciApplication.status,
            parcaciApplication.payment_status,
            parcaciApplication.membership_expires_at
          );
          isParcaciDealerActive = state === "active";
        }
      }
    } catch {
      categories = [];
      dealerApplications = [];
    }
  }

  return (
    <SiteHeaderClient
      categories={categories}
      dealerApplications={dealerApplications}
      drawerProfile={drawerProfile}
      email={email}
      hasEnv={!!env}
      hasListings={hasListings}
      isParcaciDealerActive={isParcaciDealerActive}
    />
  );
}
