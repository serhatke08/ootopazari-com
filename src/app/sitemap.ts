import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { fetchApprovedListingsForSitemap } from "@/lib/listings-data";
import { tryGetSupabaseEnv } from "@/lib/env";
import { resolvePublicSiteOrigin } from "@/lib/site-url";

/** Yeni ilanlar site haritasına yansısın (deploy beklemeden). */
export const revalidate = 3600;

const staticPaths = [
  "/",
  "/ilanlar",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await resolvePublicSiteOrigin();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));

  const env = tryGetSupabaseEnv();
  if (!env) {
    return staticEntries;
  }

  const supabase = createClient(env.url, env.anonKey);
  const listings = await fetchApprovedListingsForSitemap(supabase);

  const listingEntries: MetadataRoute.Sitemap = listings.map((row) => ({
    url: `${base}/ilan/${row.listingNumber}`,
    lastModified: row.lastModified ?? now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...listingEntries];
}
