import type { MetadataRoute } from "next";
import { SITE_DISPLAY_NAME, SITE_HOME_DESCRIPTION } from "@/lib/seo-brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_DISPLAY_NAME,
    short_name: SITE_DISPLAY_NAME,
    description: SITE_HOME_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    lang: "tr-TR",
    icons: [
      {
        src: "/menu/pazar.png?v=20260413",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/menu/pazar.png?v=20260413",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
