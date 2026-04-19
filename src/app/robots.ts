import type { MetadataRoute } from "next";
import { resolvePublicSiteOrigin } from "@/lib/site-url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await resolvePublicSiteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/giris",
          "/kayit",
          "/profil",
          "/favoriler",
          "/mesajlar",
          "/ilan-ver",
          "/ilan-duzenle",
          "/bayilik-basvuru",
          "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
