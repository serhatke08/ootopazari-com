import { SiteHeaderClient } from "@/components/SiteHeaderClient";
import { tryGetSupabaseEnv } from "@/lib/env";
import {
  fetchBayiApplicationsForMenu,
  type BayiApplicationMenuRow,
} from "@/lib/bayi-applications";
import { fetchCategories, fetchProfilePublic } from "@/lib/listings-data";
import { publicAvatarUrl } from "@/lib/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { displayNameFromAuthUser } from "@/lib/user-display-name";
import { QUICK_ACCESS_LINKS } from "@/lib/quick-access-links";

type DealerStory = {
  id: string;
  displayName: string;
  imageUrl: string | null;
  href: string;
};

const DEALER_STORIES: DealerStory[] = QUICK_ACCESS_LINKS.map((x) => ({
  id: `${x.href}-${x.label}`,
  displayName: x.label,
  imageUrl: x.image ?? null,
  href: x.href,
}));

export async function SiteHeader() {
  const env = tryGetSupabaseEnv();
  let email: string | null = null;
  let categories: Awaited<ReturnType<typeof fetchCategories>> = [];
  let dealerApplications: BayiApplicationMenuRow[] = [];
  let drawerProfile: { displayName: string; avatarUrl: string | null } | null =
    null;
  const dealerStories: DealerStory[] = DEALER_STORIES;

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
        const displayName = displayNameFromAuthUser(user, profile);
        let avatarUrl: string | null = null;
        const raw =
          profile && typeof profile.avatar_url === "string"
            ? profile.avatar_url.trim()
            : "";
        if (raw) {
          avatarUrl = /^https?:\/\//i.test(raw)
            ? raw
            : publicAvatarUrl(env, raw.replace(/^\/+/, ""));
        }
        drawerProfile = { displayName, avatarUrl };
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
      dealerStories={dealerStories}
      drawerProfile={drawerProfile}
      email={email}
      hasEnv={!!env}
    />
  );
}
