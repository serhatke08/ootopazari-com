import { buildListingSeoPath } from "@/lib/listing-seo";
import {
  SITE_ALTERNATE_NAMES,
  SITE_DISPLAY_NAME,
  canonicalSiteHomeUrl,
} from "@/lib/seo-brand";

const LOGO = "/menu/pazar.png?v=20260413";

export function buildHomeSeoJsonLd(opts: {
  siteOrigin: string;
  listings?: Array<{ listingNumber: string; title: string }>;
}) {
  const { siteOrigin, listings = [] } = opts;
  const homeUrl = canonicalSiteHomeUrl(siteOrigin);

  const graph: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      "@id": `${homeUrl}#organization`,
      name: SITE_DISPLAY_NAME,
      legalName: SITE_DISPLAY_NAME,
      url: homeUrl,
      logo: `${siteOrigin.replace(/\/$/, "")}${LOGO}`,
      description:
        "Türkiye'nin ikinci el ve sıfır otomobil ilan platformu — Oto Pazarı.",
    },
    {
      "@type": "WebSite",
      "@id": `${homeUrl}#website`,
      name: SITE_DISPLAY_NAME,
      alternateName: [...SITE_ALTERNATE_NAMES],
      url: homeUrl,
      publisher: { "@id": `${homeUrl}#organization` },
      inLanguage: "tr-TR",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${homeUrl}?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "WebPage",
      "@id": `${homeUrl}#webpage`,
      url: homeUrl,
      name: `${SITE_DISPLAY_NAME} — İkinci El ve Sıfır Araç İlanları`,
      isPartOf: { "@id": `${homeUrl}#website` },
      about: { "@id": `${homeUrl}#organization` },
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
            name: SITE_DISPLAY_NAME,
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
