import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getSiteOrigin } from "@/lib/site-url";
import { tryGetSupabaseEnv } from "@/lib/env";

export const revalidate = 3600; // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteOrigin();
  
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: origin,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${origin}/ilan-ver`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${origin}/hakkimizda`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${origin}/iletisim`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${origin}/gizlilik-politikasi`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${origin}/kullanim-kosullari`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
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

    // Fetch categories
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");

    // Fetch cities
    const { data: cities } = await supabase
      .from("cities")
      .select("id, name")
      .order("name");

    // Fetch approved listings
    const { data: listings } = await supabase
      .from("listings")
      .select("listing_number, title, updated_at")
      .eq("moderation_status", "approved")
      .order("updated_at", { ascending: false })
      .limit(10000);

    const categoryPages: MetadataRoute.Sitemap = (categories || []).map((cat) => ({
      url: `${origin}/?category_id=${cat.id}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    }));

    const cityPages: MetadataRoute.Sitemap = (cities || []).map((city) => ({
      url: `${origin}/?city_id=${city.id}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    }));

    const listingPages: MetadataRoute.Sitemap = (listings || []).map((listing) => ({
      url: `${origin}/ilan/${listing.listing_number}`,
      lastModified: listing.updated_at ? new Date(listing.updated_at) : new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    }));

    return [...staticPages, ...categoryPages, ...cityPages, ...listingPages];
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return staticPages;
  }
}
