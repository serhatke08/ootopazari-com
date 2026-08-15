import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getSiteOrigin } from "@/lib/site-url";
import { tryGetSupabaseEnv } from "@/lib/env";
import { buildListingSeoPath } from "@/lib/listing-seo";

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
      url: `${origin}/ilan-one-cikar`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
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
    {
      url: `${origin}/iade-iptal-politikasi`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${origin}/mesafeli-satis-sozlesmesi`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${origin}/on-bilgilendirme-formu`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${origin}/teslimat-kosullari`,
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

    // Fetch approved listings
    const { data: listings } = await supabase
      .from("listings")
      .select("listing_number, title, updated_at")
      .eq("moderation_status", "approved")
      .order("updated_at", { ascending: false })
      .limit(10000);

    // Sitemap yalnızca kendi kendini kanonik gösteren URL'leri içermeli.
    // Filtreli ana sayfa URL'lerinin (`/?city_id=`, `/?category_id=`) canonical'ı
    // ana sayfadır; sitemap'e girerlerse Search Console bunları
    // "alternate page with proper canonical tag" olarak eler.
    const listingPages: MetadataRoute.Sitemap = (listings || []).flatMap((listing) => {
      const path = buildListingSeoPath(listing.listing_number, listing.title);
      if (!path) return [];
      return [
        {
          url: `${origin}${path}`,
          lastModified: listing.updated_at ? new Date(listing.updated_at) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.9,
        },
      ];
    });

    return [...staticPages, ...listingPages];
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return staticPages;
  }
}
