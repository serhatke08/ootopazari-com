import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import {
  buildCategoryMap,
  buildCityMap,
  fetchCategories,
  fetchCities,
  fetchListingForDetailPage,
  fetchProfilePublic,
  fetchVehicleBrands,
  resolveListingCityDisplay,
} from "@/lib/listings-data";
import { fetchListingPublicStatsMap } from "@/lib/listing-stats";
import { fetchPriceRatingSummary, EMPTY_PRICE_RATING_SUMMARY } from "@/lib/listing-price-ratings";
import { fetchListingPriceHistory } from "@/lib/listing-price-history";
import { getSessionAndFavoriteSet } from "@/lib/favorites";
import { collectListingGalleryUrlsWithStorageFallback } from "@/lib/listing-images";
import { buildListingSeoPath, extractListingNumberFromSeoParam } from "@/lib/listing-seo";
import { buildListingVehicleJsonLd } from "@/lib/seo-json-ld";
import { getSiteOrigin } from "@/lib/site-url";
import { sanitizeUserAvatarUrl } from "@/lib/oauth-avatar";
import { resolveListingImageUrl } from "@/lib/storage";
import { FavoriteHeart } from "@/components/FavoriteHeart";
import { ListingImageGallery } from "@/components/ListingImageGallery";
import { ListingViewTracker } from "@/components/ListingViewTracker";
import { StatsBadges } from "@/components/StatsBadges";
import { CopyListingNumber } from "@/components/CopyListingNumber";
import { ExpertizDiagram } from "@/components/ExpertizDiagram";
import { mergeExpertizWithDefaults, parseExpertizPanels } from "@/lib/expertiz";
import { fetchVehicleBrandModelSeriCode } from "@/lib/vehicle-hierarchy";
import {
  fetchAdminProfileByUserId,
  publicDisplayNameWithAdmin,
} from "@/lib/admin-profile";
import { AdminVerifiedBadge } from "@/components/AdminVerifiedBadge";
import { SuspendListingButton } from "@/components/SuspendListingButton";
import { StartConversationButton } from "@/components/messages/StartConversationButton";
import { ListingContactPhone } from "@/components/ListingContactPhone";
import { ListingDetailTabs } from "@/components/ListingDetailTabs";
import { ListingPriceDisplay } from "@/components/ListingPriceDisplay";
import { ListingShareReportActions } from "@/components/ListingShareReportActions";

type Props = { params: Promise<{ listingNumber: string }> };

export const dynamic = "force-dynamic";

function pick(
  row: Record<string, unknown>,
  keys: string[]
): string | number | boolean | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v !== null && v !== undefined && v !== "") return v as string | number | boolean;
  }
  return undefined;
}

function fmtBool(v: unknown): string | undefined {
  if (v === true) return "Evet";
  if (v === false) return "Hayır";
  return undefined;
}

function fmtKm(n: unknown): string | undefined {
  if (n == null || n === "") return undefined;
  const x = Number(n);
  if (!Number.isFinite(x)) return String(n);
  return `${x.toLocaleString("tr-TR")} km`;
}

function fmtListingDate(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function strCell(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  const s = String(v).trim();
  return s || undefined;
}

function trimOnlyFromRow(row: Record<string, unknown>): string | undefined {
  return strCell(
    pick(row, [
      "vehicle_trim",
      "trim",
      "vehicle_variant",
      "variant",
      "vehicle_model_detail",
      "model_detay",
      "paket",
    ])
  );
}

/**
 * `vehicle_brand_model_id` yoksa: `vehicle_series` / `vehicle_model` / trim kolonları ile Seri+Model.
 */
function seriVeModelFromRow(
  row: Record<string, unknown>,
  vehicleModel: string | null | undefined
): { seri: string | undefined; model: string | undefined } {
  const seriesFromRow = strCell(
    pick(row, [
      "vehicle_series",
      "seri",
      "vehicle_seri",
      "series",
      "model_series",
      "vehicle_line",
    ])
  );
  const trimFromRow = trimOnlyFromRow(row);
  const cascadeModel = strCell(vehicleModel);

  if (seriesFromRow) {
    return { seri: seriesFromRow, model: trimFromRow };
  }
  if (trimFromRow) {
    return { seri: cascadeModel, model: trimFromRow };
  }
  return { seri: cascadeModel, model: undefined };
}

/** İlan açıklamasında, üstteki araç bilgisi alanlarıyla tekrarlayan satırları kaldırır. */
function stripDuplicateVehicleSpecLines(text: string): string {
  const linePatterns = [
    /^Araç\s+durumu\s*:/i,
    /^Garanti\s*:/i,
    /^Ağır\s+hasar\s+kayıtlı\s*:/i,
    /^Ağır\s+hasar\s+kaydı\s*:/i,
    /^Plaka\s*\/\s*uyruk\s*:/i,
  ];
  const lines = text.split(/\r?\n/);
  const kept = lines.filter((line) => {
    const t = line.trim();
    if (t === "") return true;
    return !linePatterns.some((re) => re.test(t));
  });
  // Ardışık boş satırları tek boşluğa indir
  const collapsed: string[] = [];
  let prevEmpty = false;
  for (const line of kept) {
    const empty = line.trim() === "";
    if (empty) {
      if (!prevEmpty) collapsed.push("");
      prevEmpty = true;
    } else {
      collapsed.push(line);
      prevEmpty = false;
    }
  }
  return collapsed.join("\n").replace(/^\n+|\n+$/g, "");
}

const EQUIPMENT_DESC_LINE =
  /^(Marka|Seri\/Model|Kasa\s+Tipi|Motor|Paket|Yakıt|Vites|Çekiş)\s*:/i;

function extractEquipmentLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && EQUIPMENT_DESC_LINE.test(l));
}

function labelFromEquipmentLines(
  lines: string[],
  label: "Motor" | "Paket"
): string | undefined {
  const re = new RegExp(`^${label}\\s*:\\s*(.+)$`, "i");
  for (const line of lines) {
    const m = line.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return undefined;
}

function extractDescriptionBody(text: string): string {
  const specLine =
    /^(Araç\s+durumu|Garanti|Ağır\s+hasar|Plaka|Marka|Seri\/Model|Kasa\s+Tipi|Motor|Paket|Yakıt|Vites|Çekiş)\s*:/i;
  const lines = text.split(/\r?\n/);
  const kept = lines.filter((line) => {
    const t = line.trim();
    if (t === "") return true;
    if (specLine.test(t)) return false;
    if (/Yakıt:.*Vites:/i.test(t)) return false;
    return true;
  });
  return stripDuplicateVehicleSpecLines(kept.join("\n")).trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { listingNumber: listingParam } = await params;
  const listingNumber = extractListingNumberFromSeoParam(listingParam) ?? listingParam;
  const env = tryGetSupabaseEnv();
  if (!env) {
    return { title: "İlan" };
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const adminMeta = user?.id
    ? await fetchAdminProfileByUserId(supabase, user.id)
    : null;
  const detail = await fetchListingForDetailPage(
    supabase,
    listingNumber,
    user?.id ?? null,
    { viewerIsAdmin: !!adminMeta }
  );
  if (!detail) {
    return { title: "İlan bulunamadı" };
  }
  const listing = detail.listing;
  const titleBase = (listing.title as string) ?? "İlan";
  const title =
    detail.access === "suspended_owner" || detail.access === "suspended_admin"
      ? `Askıya alındı — ${titleBase}`
      : titleBase;
  const city =
    (listing.city_name as string) ||
    (listing.district as string) ||
    "";
  const desc =
    typeof listing.description === "string"
      ? listing.description.slice(0, 140)
      : `${title}${city ? ` — ${city}` : ""}`;
  const metaDescription = `${desc} — Oto Pazarı'nda ikinci el araba ilanı.`;
  const imageRaw = typeof listing.image_url === "string" ? listing.image_url : null;
  const imageUrl = imageRaw ? resolveListingImageUrl(env, imageRaw) : null;
  const canonicalPath =
    buildListingSeoPath(
      listing.listing_number != null ? String(listing.listing_number) : listingNumber,
      typeof listing.title === "string" ? listing.title : title
    ) ?? `/ilan/${encodeURIComponent(listingNumber)}`;
  return {
    title,
    description: metaDescription,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${title} | Oto Pazarı`,
      description: metaDescription,
      url: canonicalPath,
      type: "article",
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: `${title} | Oto Pazarı`,
      description: metaDescription,
      images: imageUrl ? [imageUrl] : undefined,
    },
    robots:
      detail.access === "suspended_owner" || detail.access === "suspended_admin"
        ? { index: false, follow: false }
        : undefined,
  };
}

function Field({
  label,
  value,
  valueClassName = "text-black",
}: {
  label: string;
  value: string | number | boolean | null | undefined;
  /** `dd` değer satırı (ör. vurgu rengi) */
  valueClassName?: string;
}) {
  if (value === null || value === undefined || value === "") return null;
  const v =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-black/10 py-1.5 last:border-0">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-black/50">
        {label}
      </dt>
      <dd
        className={`min-w-0 text-right text-xs font-medium ${valueClassName}`}
      >
        {v}
      </dd>
    </div>
  );
}

export default async function IlanDetayPage({ params }: Props) {
  const { listingNumber: listingParam } = await params;
  const listingNumber = extractListingNumberFromSeoParam(listingParam) ?? listingParam;
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const viewerAdminProfile = viewer?.id
    ? await fetchAdminProfileByUserId(supabase, viewer.id)
    : null;
  const [detail, cities, categories] = await Promise.all([
    fetchListingForDetailPage(supabase, listingNumber, viewer?.id ?? null, {
      viewerIsAdmin: !!viewerAdminProfile,
    }),
    fetchCities(supabase),
    fetchCategories(supabase),
  ]);
  
  if (!detail) {
    // İlan bulunamadı - ana sayfaya yönlendir (SEO için daha iyi)
    redirect("/?not_found=1");
  }

  const { listing, access: detailAccess } = detail;
  const expectedSeoPath = buildListingSeoPath(
    listing.listing_number != null ? String(listing.listing_number) : listingNumber,
    typeof listing.title === "string" ? listing.title : null
  );
  if (
    expectedSeoPath &&
    decodeURIComponent(expectedSeoPath.split("/ilan/")[1] ?? "") !==
      decodeURIComponent(listingParam)
  ) {
    permanentRedirect(expectedSeoPath);
  }

  const isSuspendedOwnerView = detailAccess === "suspended_owner";
  const isSuspendedAdminView = detailAccess === "suspended_admin";
  const isSuspendedDetailView = isSuspendedOwnerView || isSuspendedAdminView;

  const id = listing.id as string | undefined;

  const cityMap = buildCityMap(cities);
  const categoryMap = buildCategoryMap(categories);
  const cityDisplayResolved = resolveListingCityDisplay(listing, cityMap);
  const categoryName =
    listing.category_id != null
      ? categoryMap.get(String(listing.category_id))?.name ?? null
      : null;
  const categoryCode =
    listing.category_id != null
      ? categoryMap.get(String(listing.category_id))?.code ?? null
      : null;
  const categoryText = `${categoryName ?? ""} ${categoryCode ?? ""}`
    .toLocaleLowerCase("tr")
    .trim();
  const isMotorcycle =
    categoryText.includes("motosiklet") ||
    categoryText.includes("motor");
  const isCarLike = !isMotorcycle;

  const row = listing as Record<string, unknown>;
  const [statsMap, sessionFav] = id
    ? await Promise.all([
        fetchListingPublicStatsMap(supabase, [id]),
        getSessionAndFavoriteSet(supabase, [id]),
      ])
    : [new Map(), { user: null, favoriteIds: new Set<string>() }];
  const stats = id ? statsMap.get(id) : undefined;

  const priceRating = id
    ? await fetchPriceRatingSummary(supabase, id, viewer?.id ?? null)
    : EMPTY_PRICE_RATING_SUMMARY;

  const priceHistory = id
    ? await fetchListingPriceHistory(supabase, id)
    : [];

  const listingDateLabel = fmtListingDate(row.created_at);
  const priceLabel =
    listing.price != null
      ? new Intl.NumberFormat("tr-TR", {
          style: "currency",
          currency: "TRY",
          maximumFractionDigits: 0,
        }).format(Number(listing.price))
      : "Fiyat sorunuz";

  const sellerUserId = listing.user_id ? String(listing.user_id) : "";
  const showMessageButton =
    detailAccess === "public" &&
    !!id &&
    !!sellerUserId &&
    !!listing.contact_via_message &&
    (!viewer?.id || viewer.id !== sellerUserId);

  const [seller, adminProfile] = await Promise.all([
    sellerUserId ? fetchProfilePublic(supabase, sellerUserId) : Promise.resolve(null),
    sellerUserId
      ? fetchAdminProfileByUserId(supabase, sellerUserId)
      : Promise.resolve(null),
  ]);

  let brandName: string | null = null;
  if (listing.vehicle_brand_id) {
    const brands = await fetchVehicleBrands(supabase, null);
    const b = brands.find((x) => x.id === listing.vehicle_brand_id);
    brandName = b?.name ?? b?.code ?? null;
  }

  const galleryUrls = await collectListingGalleryUrlsWithStorageFallback(
    supabase,
    env,
    row,
    listing.image_url as string | null
  );

  const num = listing.listing_number;
  const expertizRaw = row.expertiz_panels;
  const expertizPanelsParsed = parseExpertizPanels(expertizRaw);
  const expertizPanels =
    expertizPanelsParsed != null
      ? mergeExpertizWithDefaults(expertizPanelsParsed)
      : null;

  const plaka = pick(row, ["plate_number", "plaka", "license_plate"]);
  const uyruk = pick(row, ["nationality", "uyruk", "country_name", "country"]);

  const brandModelFk = pick(row, [
    "vehicle_brand_model_id",
    "brand_model_id",
  ]);
  let seriDisplay: string | undefined;
  let modelDisplay: string | undefined;
  if (brandModelFk != null && String(brandModelFk).trim() !== "") {
    const seriCode = await fetchVehicleBrandModelSeriCode(
      supabase,
      String(brandModelFk)
    );
    seriDisplay = seriCode ?? undefined;
    modelDisplay = trimOnlyFromRow(row);
  } else {
    const pair = seriVeModelFromRow(
      row,
      listing.vehicle_model as string | null | undefined
    );
    seriDisplay = pair.seri;
    modelDisplay = pair.model;
  }

  const sellerDisplayName = seller
    ? publicDisplayNameWithAdmin(seller, adminProfile)
    : null;
  const sellerAvatarRaw =
    sanitizeUserAvatarUrl(
      seller && typeof seller.avatar_url === "string" ? seller.avatar_url : null
    ) ?? "";
  const sellerAvSrc = sellerAvatarRaw
    ? sellerAvatarRaw.startsWith("http")
      ? sellerAvatarRaw
      : resolveListingImageUrl(env, sellerAvatarRaw)
    : null;

  const rawDesc =
    typeof listing.description === "string" ? listing.description : "";
  const equipmentLines = rawDesc.trim() ? extractEquipmentLines(rawDesc) : [];
  const descBody = rawDesc.trim() ? extractDescriptionBody(rawDesc) : "";
  const descriptionTabContent =
    !rawDesc.trim() ? (
      <p className="text-sm text-black/55">Açıklama yok.</p>
    ) : !descBody ? (
      <p className="text-sm text-black/55">
        Ayrı açıklama metni yok; teknik bilgiler Genel Bilgiler ve Donanım
        sekmelerinde.
      </p>
    ) : (
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-black">
        {descBody}
      </p>
    );

  const motorNote = pick(row, ["engine_note", "motor_note"]) as string | undefined;
  const paketNote = pick(row, ["package_note", "paket_note"]) as string | undefined;
  const kasaNote = pick(row, ["body_note", "kasa_note"]) as string | undefined;

  const motorDisplay =
    motorNote?.trim() ||
    labelFromEquipmentLines(equipmentLines, "Motor") ||
    strCell(pick(row, ["engine_name", "motor_name", "engine_label"]));
  const paketDisplay =
    paketNote?.trim() ||
    labelFromEquipmentLines(equipmentLines, "Paket") ||
    strCell(pick(row, ["package_name", "paket_name", "package_label"]));
  
  const kasaDisplay = listing.body_type?.toString().trim() || kasaNote?.trim();

  const vehicleBreadcrumb = [
    brandName?.trim(),
    modelDisplay?.trim(),
    seriDisplay?.trim(),
    motorDisplay,
    paketDisplay,
  ].filter((p): p is string => !!p);

  const equipmentTabContent =
    equipmentLines.length > 0 ? (
      <ul className="space-y-2 text-sm text-black">
        {equipmentLines.map((line) => (
          <li
            key={line}
            className="rounded-md border border-black/8 bg-black/[0.02] px-3 py-2"
          >
            {line}
          </li>
        ))}
      </ul>
    ) : (
      <dl className="space-y-0">
        <Field label="Kasa tipi" value={kasaDisplay} />
        <Field label="Motor" value={motorDisplay} />
        <Field label="Paket" value={paketDisplay} />
        <Field
          label="Motor hacmi"
          value={pick(row, ["engine_capacity", "motor_hacmi"]) as string}
        />
        <Field
          label="Motor gücü"
          value={
            pick(row, ["engine_power", "motor_gucu", "motor_power"]) as string
          }
        />
        <Field label="Çekiş" value={listing.drive_type as string} />
        {!kasaDisplay &&
        !motorDisplay &&
        !paketDisplay &&
        !pick(row, ["engine_capacity", "motor_hacmi"]) &&
        !listing.drive_type ? (
          <p className="py-2 text-sm text-black/55">Donanım bilgisi girilmemiş.</p>
        ) : null}
      </dl>
    );

  const contactPhone =
    typeof listing.contact_phone === "string"
      ? listing.contact_phone.trim()
      : "";
  const showPhone =
    !!contactPhone &&
    listing.contact_via_phone === true &&
    detailAccess === "public";

  const suspensionReason =
    listing.suspension_reason != null
      ? String(listing.suspension_reason).trim()
      : "";

  const listingTitle = String(listing.title ?? "İlan");
  const canonicalPath =
    expectedSeoPath ??
    `/ilan/${encodeURIComponent(listingNumber)}`;
  const primaryImage = galleryUrls[0] ?? null;
  const vehicleYearRaw = pick(row, ["vehicle_year", "year", "model_year"]);
  const vehicleYear =
    vehicleYearRaw != null ? Number(vehicleYearRaw) : null;
  const mileageRaw = pick(row, ["mileage", "km", "kilometre"]);
  const mileageKm =
    mileageRaw != null ? Number(mileageRaw) : null;
  const fuelType = strCell(
    pick(row, ["fuel_type", "fuel", "yakit", "yakıt"])
  );
  const transmission = strCell(
    pick(row, ["transmission", "gearbox", "vites"])
  );

  const listingJsonLd =
    !isSuspendedDetailView
      ? buildListingVehicleJsonLd({
          siteOrigin: getSiteOrigin(),
          canonicalPath,
          name: listingTitle,
          description:
            typeof listing.description === "string"
              ? listing.description
              : listingTitle,
          price:
            listing.price != null ? Number(listing.price) : null,
          image: primaryImage,
          brand: brandName,
          model: modelDisplay ?? seriDisplay ?? null,
          vehicleYear: Number.isFinite(vehicleYear) ? vehicleYear : null,
          mileageKm: Number.isFinite(mileageKm) ? mileageKm : null,
          city: cityDisplayResolved ?? null,
          fuelType: fuelType ?? null,
          transmission: transmission ?? null,
        })
      : null;

  return (
    <article
      className={`mx-auto w-full max-w-[1400px] flex-1 bg-white px-4 pb-12 pt-4 text-black sm:px-6 ${
        isSuspendedDetailView ? "opacity-[0.88] grayscale-[0.15]" : ""
      }`}
    >
      {listingJsonLd ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(listingJsonLd),
          }}
        />
      ) : null}
      {id && !isSuspendedDetailView ? (
        <ListingViewTracker listingId={id} />
      ) : null}
      {isSuspendedOwnerView ? (
        <div
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-950"
          role="status"
        >
          <p className="font-semibold">Bu ilan askıya alındı</p>
          <p className="mt-1 text-sm text-red-900/90">
            Yalnızca siz görebilirsiniz; sitede yayımlanmıyor.
            {suspensionReason ? (
              <>
                {" "}
                <span className="font-medium">Sebep:</span> {suspensionReason}
              </>
            ) : null}
          </p>
        </div>
      ) : null}
      {isSuspendedAdminView ? (
        <div
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950"
          role="status"
        >
          <p className="font-semibold">Bu ilan askıya alınmış (yayından kalkmış)</p>
          {suspensionReason ? (
            <p className="mt-1 text-sm text-amber-900/95">
              <span className="font-medium">Sebep:</span> {suspensionReason}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex text-sm font-medium text-black underline decoration-black/30 underline-offset-2 hover:decoration-black"
          >
            ← Ana sayfaya dön
          </Link>
          {vehicleBreadcrumb.length > 0 ? (
            <nav
              className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-black/70"
              aria-label="Marka ve model"
            >
              {vehicleBreadcrumb.map((part, i) => (
                <span key={`${part}-${i}`} className="inline-flex items-center">
                  {i > 0 ? (
                    <span className="mx-1.5 font-medium text-black/35" aria-hidden>
                      &gt;
                    </span>
                  ) : null}
                  <span className="font-medium text-black/85">{part}</span>
                </span>
              ))}
            </nav>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {id && detailAccess === "public" ? (
            <ListingShareReportActions
              listingId={id}
              shareTitle={(listing.title as string) ?? "İlan"}
              sharePath={
                expectedSeoPath ?? `/ilan/${encodeURIComponent(listingNumber)}`
              }
              loggedIn={!!viewer}
              canReport={
                !!viewer?.id &&
                !!sellerUserId &&
                viewer.id !== sellerUserId
              }
            />
          ) : null}
          {viewerAdminProfile && id && detailAccess === "public" ? (
            <SuspendListingButton
              listingId={id}
              listingLabel={`#${String(num ?? "?")} — ${String(listing.title ?? "İlan")}`}
            />
          ) : null}
        </div>
      </div>

      <div className="listing-detail-layout">
        <h1 className="listing-detail-title text-xl font-bold leading-tight text-black sm:text-2xl lg:text-3xl">
          {(listing.title as string) ?? "İlan"}
        </h1>

        <div className="listing-detail-gallery min-w-0">
          <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
            <ListingImageGallery
              images={galleryUrls}
              alt="İlan görseli"
              compact
              overlay={
                id && !isSuspendedDetailView ? (
                  <FavoriteHeart
                    listingId={id}
                    initialFavorited={sessionFav.favoriteIds.has(id)}
                    loggedIn={!!sessionFav.user}
                    variant="overlay"
                  />
                ) : null
              }
            />
          </div>
        </div>

        <div className="listing-detail-tabs min-w-0 max-md:mt-3">
          <ListingDetailTabs
            header={
              id ? (
                <div className="px-4 py-2.5">
                  <ListingPriceDisplay
                    listingId={id}
                    priceLabel={priceLabel}
                    listingDate={listingDateLabel}
                    summary={priceRating}
                    loggedIn={!!viewer}
                    showHistory
                    priceHistory={priceHistory}
                    priceClassName="text-base font-bold tabular-nums text-black sm:text-lg"
                    popoverPlacement="below"
                  />
                </div>
              ) : (
                <div className="px-4 py-2.5">
                  <p className="text-sm font-medium text-black/70">{priceLabel}</p>
                </div>
              )
            }
            infoContent={
              <dl className="px-3 py-1">
                {num != null ? (
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-black/10 py-1.5 last:border-0">
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-black/50">
                      İlan no
                    </dt>
                    <dd className="min-w-0 text-right text-xs font-medium">
                      <CopyListingNumber
                        text={`#${String(num)}`}
                        className="text-blue-600"
                      />
                    </dd>
                  </div>
                ) : (
                  <Field label="İlan no" value="—" />
                )}
                <Field label="Şehir" value={cityDisplayResolved ?? "—"} />
                <Field label="Kategori" value={categoryName ?? undefined} />
                <Field label="Marka" value={brandName ?? undefined} />
                <Field label="Seri" value={seriDisplay ?? "—"} />
                <Field label="Model" value={modelDisplay ?? "—"} />
                {isCarLike ? (
                  <Field label="Kasa" value={kasaDisplay} />
                ) : null}
                <Field label="Motor" value={motorDisplay} />
                <Field label="Paket" value={paketDisplay} />
                <Field label="Yıl" value={listing.vehicle_year as number} />
                <Field
                  label="Kilometre"
                  value={fmtKm(listing.vehicle_mileage ?? pick(row, ["km"]))}
                />
                <Field label="Yakıt" value={listing.fuel_type as string} />
                <Field
                  label={isMotorcycle ? "Şanzıman" : "Vites"}
                  value={listing.transmission_type as string}
                />
                <Field
                  label="Motor gücü"
                  value={pick(row, ["engine_power", "motor_gucu", "motor_power"]) as string | undefined}
                />
                <Field
                  label={isMotorcycle ? "Renk / Kaplama" : "Renk"}
                  value={listing.color as string}
                />
                <Field
                  label="Hasar"
                  value={
                    listing.is_damaged === true
                      ? "Evet"
                      : listing.is_damaged === false
                        ? "Hayır"
                        : undefined
                  }
                />
                <Field
                  label="Ağır hasar kaydı"
                  value={
                    fmtBool(
                      pick(row, [
                        "heavy_damage_record",
                        "agir_hasar_kaydi",
                        "has_heavy_damage",
                      ])
                    ) ??
                    (pick(row, ["heavy_damage_label", "agir_hasar"]) as string)
                  }
                />
                <Field
                  label={isMotorcycle ? "Motosiklet durumu" : "Araç durumu"}
                  value={pick(row, [
                    "vehicle_condition",
                    "arac_durumu",
                    "condition",
                  ]) as string}
                />
                <Field
                  label="Garanti"
                  value={pick(row, ["warranty", "garanti", "warranty_months"]) as string}
                />
                <Field
                  label="Plaka / uyruk"
                  value={
                    [plaka, uyruk].filter(Boolean).join(" · ") || undefined
                  }
                />
                <Field
                  label={isMotorcycle ? "Ekspertiz / kontrol raporu" : "Ekspertiz raporu"}
                  value={
                    listing.has_expertise === true
                      ? "Var"
                      : listing.has_expertise === false
                        ? "Yok"
                        : undefined
                  }
                />
                <Field
                  label="Takas"
                  value={
                    listing.is_tradeable === true
                      ? "Evet"
                      : listing.is_tradeable === false
                        ? "Hayır"
                        : undefined
                  }
                />
                {isCarLike ? (
                  <Field label="Çekiş" value={listing.drive_type as string} />
                ) : null}
                <Field
                  label="Motor hacmi"
                  value={pick(row, ["engine_capacity", "motor_hacmi"]) as string}
                />
              </dl>
            }
            descriptionContent={descriptionTabContent}
            equipmentContent={equipmentTabContent}
          />
        </div>

        <div className="listing-detail-aside min-w-0 max-md:mt-2">
          <div className="shrink-0 rounded-xl border border-black/10 bg-white p-3">
            {seller ? (
              <>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-black/50">
                  Satıcı
                </p>
                <Link
                  href={`/kullanici/${sellerUserId}`}
                  className="flex items-center gap-2 rounded-lg transition hover:bg-black/[0.03]"
                >
                  {sellerAvSrc ? (
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-black/5">
                      <Image
                        src={sellerAvSrc}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/10 text-sm font-semibold text-black/55"
                      aria-hidden
                    >
                      {(sellerDisplayName ?? "?").trim().slice(0, 1).toUpperCase() ||
                        "?"}
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <p className="truncate text-sm font-semibold text-black">
                      {sellerDisplayName}
                    </p>
                    {adminProfile ? <AdminVerifiedBadge /> : null}
                  </div>
                </Link>
                {stats ? (
                  <div className="mt-3 border-t border-black/10 pt-3">
                    <StatsBadges
                      variant="inline"
                      views={stats.views}
                      favorites={stats.favorites}
                    />
                  </div>
                ) : null}
                {showMessageButton && id ? (
                  <div className="mt-3 flex gap-2">
                    <div className={showPhone ? "min-w-0 flex-1" : "w-full"}>
                      <StartConversationButton
                        listingId={id}
                        ownerUserId={sellerUserId}
                      />
                    </div>
                    {showPhone ? (
                      <div className="min-w-0 flex-1">
                        <ListingContactPhone phone={contactPhone} />
                      </div>
                    ) : null}
                  </div>
                ) : showPhone ? (
                  <div className="mt-3">
                    <ListingContactPhone phone={contactPhone} />
                  </div>
                ) : null}
                <div className="mt-3 border-t border-black/10 pt-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-black/50">
                    Konum
                  </p>
                  <dl className="text-sm text-black">
                    <Field label="Şehir" value={cityDisplayResolved ?? undefined} />
                    <Field label="İlçe" value={listing.district as string} />
                    <Field label="Ülke" value={listing.country_name as string} />
                  </dl>
                </div>
              </>
            ) : (
              <>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-black/50">
                  Konum
                </p>
                <dl className="text-sm text-black">
                  <Field label="Şehir" value={cityDisplayResolved ?? undefined} />
                  <Field label="İlçe" value={listing.district as string} />
                  <Field label="Ülke" value={listing.country_name as string} />
                </dl>
              </>
            )}
          </div>
        </div>
      </div>

      {expertizPanels ? (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-black">
            Ekspertiz bilgileri
          </h2>
          <ExpertizDiagram panels={expertizPanels} />
        </section>
      ) : expertizRaw != null ? (
        <section className="mt-10 rounded-lg border border-black/15 bg-white p-4 text-sm text-black">
          Ekspertiz verisi tanınmadı; ham veri aşağıda. Şema ile eşleşmesi için
          panelleri JSON veya beklenen anahtarlarla kaydedin.
          <details className="mt-2">
            <summary className="cursor-pointer font-medium">Ham veri</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded border border-black/10 bg-white p-2 text-xs text-black">
              {typeof expertizRaw === "string"
                ? expertizRaw
                : JSON.stringify(expertizRaw, null, 2)}
            </pre>
          </details>
        </section>
      ) : null}

    </article>
  );
}
