import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchAdminProfileByUserId } from "@/lib/admin-profile";
import { getSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type AdminApiContext =
  | { ok: true; userId: string; service: SupabaseClient }
  | { ok: false; status: 401 | 403 | 500; error: string; message?: string };

async function resolveUserIdFromRequest(): Promise<string | null> {
  // 1) Cookie oturumu (web admin)
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch {
    /* ignore */
  }

  // 2) Bearer JWT (mobil uygulama)
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const auth = h.get("authorization") ?? h.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    const jwt = auth.slice("Bearer ".length).trim();
    if (!jwt) return null;
    const { url, anonKey } = getSupabaseEnv();
    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

/** Web admin + mobil: service_role + admin_profiles doğrulaması. */
export async function requireAdminServiceClient(): Promise<AdminApiContext> {
  const userId = await resolveUserIdFromRequest();
  if (!userId) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  const probe = createSupabaseServiceClient() ?? (await createSupabaseServerClient());
  const admin = await fetchAdminProfileByUserId(probe, userId);
  if (!admin) {
    return { ok: false, status: 403, error: "forbidden" };
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return {
      ok: false,
      status: 500,
      error: "server_config",
      message: "SUPABASE_SERVICE_ROLE_KEY eksik.",
    };
  }

  return { ok: true, userId, service };
}

export const ADMIN_LISTING_TABLES = [
  "listings",
  "kiralik_listings",
  "galeri_listings",
  "expertiz_listings",
  "parcaci_listings",
] as const;

export type AdminListingTable = (typeof ADMIN_LISTING_TABLES)[number];

export function parseAdminListingTable(raw: unknown): AdminListingTable {
  const value = typeof raw === "string" ? raw.trim() : "";
  if ((ADMIN_LISTING_TABLES as readonly string[]).includes(value)) {
    return value as AdminListingTable;
  }
  return "listings";
}
