import { buildListingSeoPath } from "@/lib/listing-seo";

const LOGO = "/menu/pazar.png?v=20260413";

export function buildHomeSeoJsonLd(opts: {
  siteOrigin: string;
  listings?: Array<{ listingNumber: string; title: string }>;
}) {
  const { siteOrigin, listings = [] } = opts;

  const graph: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      "@id": `${siteOrigin}/#organization`,
      name: "Oto Pazarı",
      url: siteOrigin,
      logo: `${siteOrigin}${LOGO}`,
      description:
        "Türkiye'nin ikinci el ve sıfır otomobil ilan platformu — Oto Pazarı.",
    },
    {
      "@type": "WebSite",
      "@id": `${siteOrigin}/#website`,
      name: "Oto Pazarı",
      alternateName: ["oto pazarı", "Oto Pazari", "otomobil pazarı"],
      url: siteOrigin,
      publisher: { "@id": `${siteOrigin}/#organization` },
      inLanguage: "tr-TR",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteOrigin}/?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "WebPage",
      "@id": `${siteOrigin}/#webpage`,
      url: siteOrigin,
      name: "Oto Pazarı — İkinci El ve Sıfır Araç İlanları",
      isPartOf: { "@id": `${siteOrigin}/#website` },
      about: { "@id": `${siteOrigin}/#organization` },
      inLanguage: "tr-TR",
      description:
        "Oto Pazarı ile ikinci el araba, sıfır otomobil ve araç ilanlarını keşfedin.",
    },
  ];

  if (listings.length > 0) {
    graph.push({
      "@type": "ItemList",
      name: "Güncel araç ilanları — Oto Pazarı",
      numberOfItems: listings.length,
      itemListElement: listings.map((item, index) => {
        const path =
          buildListingSeoPath(item.listingNumber, item.title) ??
          `/ilan/${item.listingNumber}`;
        return {
          "@type": "ListItem",
          position: index + 1,
          url: `${siteOrigin}${path}`,
          name: item.title,
        };
      }),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function buildListingVehicleJsonLd(opts: {
  siteOrigin: string;
  canonicalPath: string;
  name: string;
  description?: string;
  price?: number | null;
  image?: string | null;
  brand?: string | null;
  model?: string | null;
  vehicleYear?: number | null;
  mileageKm?: number | null;
  city?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
}) {
  const {
    siteOrigin,
    canonicalPath,
    name,
    description,
    price,
    image,
    brand,
    model,
    vehicleYear,
    mileageKm,
    city,
    fuelType,
    transmission,
  } = opts;

  const url = `${siteOrigin}${canonicalPath}`;

  const vehicle: Record<string, unknown> = {
    "@type": "Car",
    name,
    url,
    ...(brand ? { brand: { "@type": "Brand", name: brand } } : {}),
    ...(model ? { model } : {}),
    ...(vehicleYear ? { vehicleModelDate: String(vehicleYear) } : {}),
    ...(mileageKm != null && Number.isFinite(mileageKm)
      ? {
          mileageFromOdometer: {
            "@type": "QuantitativeValue",
            value: mileageKm,
            unitCode: "KMT",
          },
        }
      : {}),
    ...(fuelType ? { fuelType } : {}),
    ...(transmission ? { vehicleTransmission: transmission } : {}),
    ...(image ? { image: [image] } : {}),
  };

  const offer =
    price != null && Number.isFinite(price) && price > 0
      ? {
          "@type": "Offer",
          price: price,
          priceCurrency: "TRY",
          availability: "https://schema.org/InStock",
          url,
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Oto Pazarı",
            item: siteOrigin,
          },
          {
            "@type": "ListItem",
            position: 2,
            name,
            item: url,
          },
        ],
      },
      {
        "@type": "Product",
        name,
        description: description?.slice(0, 500) ?? name,
        url,
        image: image ? [image] : undefined,
        brand: brand ? { "@type": "Brand", name: brand } : undefined,
        offers: offer,
        category: "Otomobil",
        ...(city
          ? {
              areaServed: {
                "@type": "City",
                name: city,
              },
            }
          : {}),
      },
      {
        ...vehicle,
        offers: offer,
      },
    ],
  };
}
