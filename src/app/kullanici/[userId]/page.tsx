import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminVerifiedBadge } from "@/components/AdminVerifiedBadge";
import { ListingCard } from "@/components/ListingCard";
import { fetchAdminProfileByUserId, publicDisplayNameWithAdmin } from "@/lib/admin-profile";
import { tryGetSupabaseEnv } from "@/lib/env";
import { getSessionAndFavoriteSet } from "@/lib/favorites";
import {
  buildCategoryMap,
  fetchApprovedListingsForUserPublic,
  fetchCategories,
  fetchProfilePublic,
} from "@/lib/listings-data";
import { fetchListingPublicStatsMap } from "@/lib/listing-stats";
import { sanitizeUserAvatarUrl } from "@/lib/oauth-avatar";
import { resolveListingImageUrl } from "@/lib/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ userId: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  return {
    title: "Kullanıcı Profili",
    description: `Kullanıcı ${userId.slice(0, 8)}...`,
  };
}

export default async function KullaniciProfilPage({ params }: Props) {
  const { userId } = await params;
  const env = tryGetSupabaseEnv();
  if (!env) return null;

  const supabase = await createSupabaseServerClient();
  const [profile, adminProfile, listings, categories] = await Promise.all([
    fetchProfilePublic(supabase, userId),
    fetchAdminProfileByUserId(supabase, userId),
    fetchApprovedListingsForUserPublic(supabase, userId),
    fetchCategories(supabase),
  ]);

  if (!profile) notFound();

  const displayName = publicDisplayNameWithAdmin(profile, adminProfile);
  const avatarRaw =
    sanitizeUserAvatarUrl(
      profile.avatar_url != null ? String(profile.avatar_url).trim() : null
    ) ?? "";
  const avatarSrc = avatarRaw ? resolveListingImageUrl(env, avatarRaw) : null;
  const username =
    profile.username != null && String(profile.username).trim() !== ""
      ? String(profile.username).trim()
      : "kullanici";
  const joinedAt =
    profile.created_at != null ? new Date(String(profile.created_at)) : null;

  const catMap = buildCategoryMap(categories);
  const ids = listings.map((r) => r.id).filter(Boolean) as string[];
  const [statsMap, sessionFav] = await Promise.all([
    fetchListingPublicStatsMap(supabase, ids),
    getSessionAndFavoriteSet(supabase, ids),
  ]);
  const loggedIn = !!sessionFav.user;
  const favSet = sessionFav.favoriteIds;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <Link href="/mesajlar" className="text-sm font-medium text-emerald-800 hover:underline">
        ← Mesajlar
      </Link>

      <section className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-6 shadow-sm sm:px-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative h-24 w-24 overflow-hidden rounded-full bg-zinc-200 ring-2 ring-zinc-200 ring-offset-2 ring-offset-white">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt=""
                width={96}
                height={96}
                className="h-24 w-24 object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-zinc-600">
                {displayName.trim().slice(0, 1).toUpperCase() || "?"}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <h1 className="max-w-[min(100%,18rem)] truncate text-xl font-semibold text-zinc-900">
              {displayName}
            </h1>
            {adminProfile ? <AdminVerifiedBadge size={18} /> : null}
          </div>
          <p className="mt-0.5 text-sm text-zinc-600">@{username}</p>

          <div className="mt-4 grid w-full max-w-md grid-cols-2 gap-2">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-xs text-zinc-500">Yayındaki ilan</p>
              <p className="text-base font-semibold text-zinc-900">{listings.length}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-xs text-zinc-500">Üyelik</p>
              <p className="text-base font-semibold text-zinc-900">
                {joinedAt
                  ? joinedAt.toLocaleDateString("tr-TR", {
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-zinc-900">İlanları</h2>
        {listings.length === 0 ? (
          <p className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
            Yayında ilan bulunamadı.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
            {listings.map((listing) => {
              const id = listing.id as string | undefined;
              const categoryName =
                listing.category_id != null
                  ? catMap.get(String(listing.category_id))?.name ?? null
                  : null;
              return (
                <li key={id ?? String(listing.listing_number)}>
                  <ListingCard
                    listing={listing}
                    env={env}
                    categoryName={categoryName}
                    stats={id ? statsMap.get(id) ?? null : null}
                    loggedIn={loggedIn}
                    favorited={id ? favSet.has(id) : false}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
