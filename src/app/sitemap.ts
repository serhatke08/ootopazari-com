import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { fetchApprovedListingsForSitemap } from "@/lib/listings-data";
import { tryGetSupabaseEnv } from "@/lib/env";
import { buildListingSeoPath } from "@/lib/listing-seo";
import { getAllSeoGuideSlugs } from "@/lib/seo-guides";
import { resolvePublicSiteOrigin } from "@/lib/site-url";

/** Yeni ilanlar site haritasına yansısın (deploy beklemeden). */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await resolvePublicSiteOrigin();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/rehber`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...getAllSeoGuideSlugs().map((slug) => ({
      url: `${base}/rehber/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];

  const env = tryGetSupabaseEnv();
  if (!env) {
    return staticEntries;
  }

  const supabase = createClient(env.url, env.anonKey);
  const listings = await fetchApprovedListingsForSitemap(supabase);

  const listingEntries: MetadataRoute.Sitemap = listings.map((row) => {
    const path =
      buildListingSeoPath(row.listingNumber, row.title) ??
      `/ilan/${row.listingNumber}`;
    return {
      url: `${base}${path}`,
      lastModified: row.lastModified ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    };
  });

  return [...staticEntries, ...listingEntries];
}
