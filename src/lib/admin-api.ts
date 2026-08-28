import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAdminProfileByUserId } from "@/lib/admin-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type AdminApiContext =
  | { ok: true; userId: string; service: SupabaseClient }
  | { ok: false; status: 401 | 403 | 500; error: string; message?: string };

/** Web admin: yalnızca sil / askıya al — service_role + admin_profiles doğrulaması. */
export async function requireAdminServiceClient(): Promise<AdminApiContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  const admin = await fetchAdminProfileByUserId(supabase, user.id);
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

  return { ok: true, userId: user.id, service };
}

/** admin_* RPC — oturum açmış admin JWT (service_role auth.uid() vermez). */
export async function requireAdminSessionClient(): Promise<
  | { ok: true; userId: string; supabase: SupabaseClient }
  | { ok: false; status: 401 | 403; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  const admin = await fetchAdminProfileByUserId(supabase, user.id);
  if (!admin) {
    return { ok: false, status: 403, error: "forbidden" };
  }

  return { ok: true, userId: user.id, supabase };
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
