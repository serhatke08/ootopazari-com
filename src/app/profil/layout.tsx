import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { User } from "@supabase/supabase-js";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import { fetchAdminProfileByUserId } from "@/lib/admin-profile";
import { fetchFollowCounts } from "@/lib/profile-follows";
import { fetchProfilePublic } from "@/lib/listings-data";
import { sanitizeUserAvatarUrl } from "@/lib/oauth-avatar";
import { resolveListingImageUrl } from "@/lib/storage";
import { ProfilHeader } from "@/components/ProfilHeader";
import { ProfilSubnav } from "@/components/ProfilSubnav";

export const metadata: Metadata = {
  title: "Profilim",
  robots: { index: false, follow: false },
};

function readNamesAndAvatar(user: User): {
  firstName: string | null;
  lastName: string | null;
  avatarRaw: string | null;
} {
  const m = user.user_metadata as Record<string, unknown> | undefined;
  if (!m) {
    return { firstName: null, lastName: null, avatarRaw: null };
  }
  return {
    firstName: typeof m.first_name === "string" ? m.first_name.trim() || null : null,
    lastName: typeof m.last_name === "string" ? m.last_name.trim() || null : null,
    avatarRaw: sanitizeUserAvatarUrl(
      typeof m.avatar_url === "string" ? m.avatar_url.trim() || null : null
    ),
  };
}

function initials(
  first: string | null,
  last: string | null,
  email: string | null | undefined
): string {
  const a = first?.charAt(0);
  const b = last?.charAt(0);
  if (a && b) return (a + b).toLocaleUpperCase("tr");
  if (a) return a.toLocaleUpperCase("tr");
  if (email) return email.slice(0, 2).toLocaleUpperCase("tr");
  return "?";
}

export default async function ProfilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/giris?next=${encodeURIComponent("/profil")}`);
  }

  const [profile, adminProfile, followCounts] = await Promise.all([
    user.id ? fetchProfilePublic(supabase, user.id) : Promise.resolve(null),
    user.id ? fetchAdminProfileByUserId(supabase, user.id) : Promise.resolve(null),
    user.id ? fetchFollowCounts(supabase, user.id) : Promise.resolve({ followers: 0, following: 0 }),
  ]);

  const meta = readNamesAndAvatar(user);
  let firstName = meta.firstName;
  let lastName = meta.lastName;

  const profileFull =
    profile?.full_name != null ? String(profile.full_name).trim() : "";
  // Profil düzenlemede kaydedilen değerleri (profiles.full_name) her zaman öncelikle göster.
  if (profileFull) {
    const parts = profileFull.split(/\s+/).filter(Boolean);
    firstName = parts[0] ?? null;
    lastName = parts.slice(1).join(" ") || null;
  }

  const avatarFromProfile = sanitizeUserAvatarUrl(
    profile?.avatar_url != null ? String(profile.avatar_url).trim() : null
  );
  const avatarRaw = avatarFromProfile || meta.avatarRaw || null;
  const avatarSrc = avatarRaw ? resolveListingImageUrl(env, avatarRaw) : null;
  const hasAvatar = Boolean(avatarFromProfile || meta.avatarRaw);

  const displayName =
    profileFull ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    user.email?.split("@")[0]?.trim() ||
    "Profil";

  const initialsLabel = initials(firstName, lastName, user.email);
  const publicProfileHref = `/kullanici/${encodeURIComponent(user.id)}`;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Profilim
      </h1>

      <ProfilHeader
        displayName={displayName}
        firstName={firstName}
        lastName={lastName}
        email={user.email}
        avatarSrc={avatarSrc}
        initialsLabel={initialsLabel}
        verifiedBadge={!!adminProfile}
        hasAvatar={hasAvatar}
        username={profile?.username != null ? String(profile.username) : null}
        publicProfileHref={publicProfileHref}
        followerCount={followCounts.followers}
        followingCount={followCounts.following}
      />

      <ProfilSubnav />

      {children}
    </div>
  );
}
