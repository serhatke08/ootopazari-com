import type { User } from "@supabase/supabase-js";
import type { SupabasePublicEnv } from "@/lib/env";
import { fetchAdminProfileByUserId } from "@/lib/admin-profile";
import { fetchFollowCounts } from "@/lib/profile-follows";
import { fetchProfilePublic } from "@/lib/listings-data";
import { avatarUrlFromAuthUser, sanitizeUserAvatarUrl } from "@/lib/oauth-avatar";
import { resolveListingImageUrl } from "@/lib/storage";
import { ProfilHeader } from "@/components/ProfilHeader";
import { ProfilSubnav } from "@/components/ProfilSubnav";
import { ProfilTitleRow } from "@/components/ProfilTitleRow";
import { PaymentServiceCompactSummary } from "@/components/PaymentHistoryList";
import { fetchUserPaymentServiceSummaries } from "@/lib/payment-history";
import { initialFromName } from "@/lib/user-display-name";
import { fetchListingQuota } from "@/lib/listing-quota";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  resolveUsernameCandidate,
  sanitizeUsernameCandidate,
} from "@/lib/profile-username";

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
    avatarRaw: avatarUrlFromAuthUser(user),
  };
}

type ProfileExtras = {
  phone?: string | null;
  eids_kullanici_kodu?: string | null;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

export async function ProfilLayoutBody({
  env,
  user,
  children,
}: {
  env: SupabasePublicEnv;
  user: User;
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();
  const quotaClient = service ?? supabase;

  const [profile, adminProfile, followCounts, serviceSummaries, listingQuota, extrasRes] =
    await Promise.all([
      user.id ? fetchProfilePublic(supabase, user.id) : Promise.resolve(null),
      user.id ? fetchAdminProfileByUserId(supabase, user.id) : Promise.resolve(null),
      user.id
        ? fetchFollowCounts(supabase, user.id)
        : Promise.resolve({ followers: 0, following: 0 }),
      user.id
        ? fetchUserPaymentServiceSummaries(supabase, user.id)
        : Promise.resolve([]),
      user.id ? fetchListingQuota(quotaClient, user.id) : Promise.resolve(null),
      user.id
        ? supabase
            .from("profiles")
            .select("phone, eids_kullanici_kodu, username, full_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  let extras = (extrasRes as { data?: ProfileExtras | null })?.data ?? null;

  // Oturum ile okunamadıysa service ile dene
  if ((!extras || !sanitizeUsernameCandidate(extras.username)) && service) {
    const { data } = await service
      .from("profiles")
      .select("phone, eids_kullanici_kodu, username, full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    if (data) extras = data as ProfileExtras;
  }

  const meta = readNamesAndAvatar(user);
  let firstName = meta.firstName;
  let lastName = meta.lastName;

  const profileFull =
    (extras?.full_name != null ? String(extras.full_name).trim() : "") ||
    (profile?.full_name != null ? String(profile.full_name).trim() : "");
  if (profileFull) {
    const parts = profileFull.split(/\s+/).filter(Boolean);
    firstName = parts[0] ?? null;
    lastName = parts.slice(1).join(" ") || null;
  }

  const avatarFromProfile = sanitizeUserAvatarUrl(
    (extras?.avatar_url != null ? String(extras.avatar_url).trim() : null) ||
      (profile?.avatar_url != null ? String(profile.avatar_url).trim() : null)
  );
  const avatarRaw = avatarFromProfile || meta.avatarRaw || null;
  const avatarSrc = avatarRaw ? resolveListingImageUrl(env, avatarRaw) : null;
  const hasAvatar = Boolean(avatarFromProfile || meta.avatarRaw);

  const displayName =
    profileFull ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    user.email?.split("@")[0]?.trim() ||
    "Profil";

  const initialsLabel = initialFromName(firstName || displayName);
  const publicProfileHref = `/kullanici/${encodeURIComponent(user.id)}`;

  let username =
    sanitizeUsernameCandidate(extras?.username) ||
    sanitizeUsernameCandidate(
      profile?.username != null ? String(profile.username) : null
    ) ||
    resolveUsernameCandidate(user, null);

  // Profil satırında username boşsa metadata/e-posta adayını yaz
  if (
    service &&
    extras &&
    !sanitizeUsernameCandidate(extras.username) &&
    username
  ) {
    const { data: taken } = await service
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", user.id)
      .maybeSingle();
    let toSave = username;
    if (taken) {
      const suffix = user.id.replace(/-/g, "").slice(0, 6);
      toSave = sanitizeUsernameCandidate(`${username}_${suffix}`) ?? username;
    }
    const { error } = await service
      .from("profiles")
      .update({ username: toSave })
      .eq("id", user.id);
    if (!error) username = toSave;
  }

  const phone = extras?.phone != null ? String(extras.phone).trim() : "";
  const eidsKodu =
    extras?.eids_kullanici_kodu != null
      ? String(extras.eids_kullanici_kodu).trim()
      : "";
  const emailVerified = Boolean(
    (user as { email_confirmed_at?: string | null }).email_confirmed_at ||
      user.confirmed_at
  );

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <ProfilTitleRow email={user.email ?? ""} />

      <ProfilHeader
        displayName={displayName}
        firstName={firstName}
        lastName={lastName}
        email={user.email}
        avatarSrc={avatarSrc}
        initialsLabel={initialsLabel}
        verifiedBadge={!!adminProfile}
        hasAvatar={hasAvatar}
        username={username}
        publicProfileHref={publicProfileHref}
        followerCount={followCounts.followers}
        followingCount={followCounts.following}
        listingQuota={
          listingQuota
            ? {
                remaining: listingQuota.remaining,
                limit: listingQuota.limit,
                unlimited: listingQuota.unlimited,
              }
            : null
        }
        emailVerified={emailVerified}
        phoneOk={Boolean(phone)}
        eidsOk={Boolean(eidsKodu)}
        phone={phone || null}
      />

      <PaymentServiceCompactSummary summaries={serviceSummaries} />

      <ProfilSubnav isAdmin={!!adminProfile} />

      {children}
    </div>
  );
}
