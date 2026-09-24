import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getSiteOrigin } from "@/lib/site-url";
import { tryGetSupabaseEnv } from "@/lib/env";
import { buildListingSeoPath } from "@/lib/listing-seo";
import { listingSeoLabelFromFields } from "@/lib/listing-seo-label";
import { SEO_HUB_PAGES } from "@/lib/seo-hubs";
import { getAllSeoGuideSlugs } from "@/lib/seo-guides";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteOrigin();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: origin,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    ...SEO_HUB_PAGES.map((hub) => ({
      url: `${origin}${hub.path}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.95,
    })),
    {
      url: `${origin}/acil`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.85,
    },
    {
      url: `${origin}/rehber`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...getAllSeoGuideSlugs().map((slug) => ({
      url: `${origin}/rehber/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: `${origin}/ilan-one-cikar`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${origin}/hakkimizda`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const env = tryGetSupabaseEnv();
  if (!env) return staticPages;

  try {
    const supabase = createClient(env.url, env.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: listings } = await supabase
      .from("listings")
      .select(
        "listing_number, title, vehicle_model, vehicle_brand_id, updated_at"
      )
      .eq("moderation_status", "approved")
      .order("updated_at", { ascending: false })
      .limit(10000);

    const brandIds = [
      ...new Set(
        (listings || [])
          .map((l) =>
            l.vehicle_brand_id != null ? String(l.vehicle_brand_id) : ""
          )
          .filter(Boolean)
      ),
    ];

    const brandNameById = new Map<string, string>();
    if (brandIds.length > 0) {
      const { data: brands } = await supabase
        .from("vehicle_brands")
        .select("id,name,code")
        .in("id", brandIds.slice(0, 5000));
      for (const b of brands ?? []) {
        const id = String((b as { id?: string }).id ?? "");
        if (!id) continue;
        const name = String((b as { name?: string }).name ?? "").trim();
        const code = String((b as { code?: string }).code ?? "").trim();
        brandNameById.set(id, name || code);
      }
    }

    const listingPages: MetadataRoute.Sitemap = (listings || []).flatMap(
      (listing) => {
        const brandId =
          listing.vehicle_brand_id != null
            ? String(listing.vehicle_brand_id)
            : "";
        const label = listingSeoLabelFromFields({
          brandName: brandId ? brandNameById.get(brandId) ?? null : null,
          vehicleModel:
            typeof listing.vehicle_model === "string"
              ? listing.vehicle_model
              : null,
          title: typeof listing.title === "string" ? listing.title : null,
        });
        const path = buildListingSeoPath(listing.listing_number, label);
        if (!path) return [];
        return [
          {
            url: `${origin}${path}`,
            lastModified: listing.updated_at
              ? new Date(listing.updated_at)
              : now,
            changeFrequency: "weekly" as const,
            priority: 0.9,
          },
        ];
      }
    );

    return [...staticPages, ...listingPages];
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return staticPages;
  }
}
