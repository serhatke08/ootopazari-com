import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oto Pazarı",
    short_name: "Oto Pazarı",
    description:
      "İkinci el ve sıfır araç ilanlarını keşfedin, favorileyin ve satıcılarla mesajlaşın.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffcc00",
    theme_color: "#ffcc00",
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
