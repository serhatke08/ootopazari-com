import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { MissingEnv } from "@/components/MissingEnv";
import { ListingDetailSkeleton } from "@/components/ListingDetailSkeleton";
import { loadListingDetailRequest } from "@/lib/listing-detail-request";
import {
  buildCategoryMap,
  buildCityMap,
  fetchCategories,
  fetchCities,
  fetchProfilePublic,
  fetchVehicleBrandName,
  resolveListingCityDisplay,
} from "@/lib/listings-data";
import { fetchListingPublicStatsMap } from "@/lib/listing-stats";
import { fetchPriceRatingSummary, EMPTY_PRICE_RATING_SUMMARY } from "@/lib/listing-price-ratings";
import { fetchListingPriceHistory } from "@/lib/listing-price-history";
import { getSessionAndFavoriteSet } from "@/lib/favorites";
import { collectListingGalleryUrlsWithStorageFallback } from "@/lib/listing-images";
import {
  buildListingSeoPath,
  isNonCanonicalListingPath,
} from "@/lib/listing-seo";
import { buildListingVehicleJsonLd } from "@/lib/seo-json-ld";
import { getSiteOrigin } from "@/lib/site-url";
import { sanitizeUserAvatarUrl } from "@/lib/oauth-avatar";
import { resolveListingImageUrl } from "@/lib/storage";
import { FavoriteHeart } from "@/components/FavoriteHeart";
import { ListingBackButton } from "@/components/ListingBackButton";
import { ListingImageGallery } from "@/components/ListingImageGallery";
import { ListingViewTracker } from "@/components/ListingViewTracker";
import { ListingDetailSellerStats } from "@/components/ListingDetailSellerStats";
import { ListingDetailStatsRow } from "@/components/ListingDetailStatsRow";
import { ListingDetailContactDock } from "@/components/ListingDetailContactDock";
import {
  parseDescriptionSpecLine,
  parseDescriptionVehicleSpecs,
  resolveListingModelDisplay,
  type ListingSpecRow,
} from "@/lib/listing-vehicle-display";
import { CopyListingNumber } from "@/components/CopyListingNumber";
import { ListingVehicleSpecs } from "@/components/ListingVehicleSpecs";
import { ExpertizDiagram } from "@/components/ExpertizDiagram";
import { mergeExpertizWithDefaults, parseExpertizPanels } from "@/lib/expertiz";
import {
  fetchVehicleBrandModelSeriCode,
  fetchListingEnginePackageLabels,
  formatListingSeriesLine,
  resolveListingVehicleCatalogParts,
} from "@/lib/vehicle-hierarchy";
import {
  fetchAdminProfileByUserId,
  publicDisplayNameWithAdmin,
} from "@/lib/admin-profile";
import { AdminVerifiedBadge } from "@/components/AdminVerifiedBadge";
import { SuspendListingButton } from "@/components/SuspendListingButton";
import { StartConversationButton } from "@/components/messages/StartConversationButton";
import { ListingContactPhone } from "@/components/ListingContactPhone";
import { ListingDetailTabs } from "@/components/ListingDetailTabs";
import { ListingDescriptionText } from "@/components/ListingDescriptionText";
import { ListingShareReportActions } from "@/components/ListingShareReportActions";
import { ADSENSE_LISTING_DETAIL_SLOT } from "@/lib/adsense";
import { AdSenseUnit } from "@/components/AdSenseUnit";
import { ListingPublicChatPanelLoader } from "@/components/listing/ListingPublicChatPanelLoader";
import { fetchListingPublicComments } from "@/lib/listing-public-comments";
import { displayNameFromAuthUser } from "@/lib/user-display-name";
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

function fmtEngineCapacity(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "string") {
    const raw = v.trim();
    if (!raw) return undefined;
    if (/(cc|cm3|cm³|lt|litre|liter|l)$/i.test(raw)) return raw;
    const n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n)) return raw;
    return n > 20
      ? `${Math.round(n).toLocaleString("tr-TR")} cc`
      : `${String(n).replace(".", ",")} L`;
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n > 20
    ? `${Math.round(n).toLocaleString("tr-TR")} cc`
    : `${String(n).replace(".", ",")} L`;
}

function fmtHorsepower(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "string" && /hp|bg|ps/i.test(v)) return v.trim();
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return `${Math.round(n).toLocaleString("tr-TR")} HP`;
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

function firstSpecLine(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const value = parseDescriptionSpecLine(text, label);
    if (value) return value;
  }
  return undefined;
}

function optionalSpecValue(
  value: string | number | boolean | null | undefined
): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "boolean") return value ? "Evet" : "Hayır";
  const text = String(value).trim();
  return text || undefined;
}

function specRow(
  label: string,
  value: string | number | boolean | null | undefined
): ListingSpecRow | null {
  const v = optionalSpecValue(value);
  return v ? { label, value: v } : null;
}

function compactRows(rows: Array<ListingSpecRow | null | undefined>): ListingSpecRow[] {
  return rows.filter((row): row is ListingSpecRow => Boolean(row));
}

function stripKnownParts(
  text: string | null | undefined,
  parts: Array<string | null | undefined>
): string | undefined {
  let out = text?.trim() ?? "";
  if (!out) return undefined;
  for (const part of parts) {
    const p = part?.trim();
    if (!p) continue;
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out
      .replace(new RegExp(`\\b${escaped}\\b`, "i"), "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  return out || undefined;
}

function inferModelOnlyFromVehicleModel(
  vehicleModel: string | null | undefined
): string | undefined {
  const raw = vehicleModel?.trim();
  if (!raw) return undefined;
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return raw;
  const numericIndex = parts.findIndex((part, index) => {
    if (index === 0) return false;
    return /\d/.test(part);
  });
  if (numericIndex > 0) {
    return parts.slice(0, numericIndex).join(" ");
  }
  return parts[0];
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
  const { env, listingNumber, detail } = await loadListingDetailRequest(listingParam);
  if (!env) {
    return { title: "İlan" };
  }
  // `notFound()` ve `permanentRedirect()` burada çağrılır çünkü generateMetadata
  // yanıt başlıkları gönderilmeden önce çözülür. Route-level `loading.tsx`
  // bunları 200'e çevirdiği için kullanılmıyor.
  if (!detail) {
    notFound();
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
  if (isNonCanonicalListingPath(canonicalPath, listingParam)) {
    permanentRedirect(canonicalPath);
  }
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
  const ctx = await loadListingDetailRequest(listingParam);
  if (!ctx.env) {
    return (
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }
  if (!ctx.detail) {
    notFound();
  }
  const expectedSeoPath = buildListingSeoPath(
    ctx.detail.listing.listing_number != null
      ? String(ctx.detail.listing.listing_number)
      : ctx.listingNumber,
    typeof ctx.detail.listing.title === "string" ? ctx.detail.listing.title : null
  );
  if (expectedSeoPath && isNonCanonicalListingPath(expectedSeoPath, listingParam)) {
    permanentRedirect(expectedSeoPath);
  }

  return (
    <Suspense fallback={<ListingDetailSkeleton />}>
      <IlanDetayBody listingParam={listingParam} />
    </Suspense>
  );
}

async function IlanDetayBody({ listingParam }: { listingParam: string }) {
  const ctx = await loadListingDetailRequest(listingParam);
  const env = ctx.env;
  const supabase = ctx.supabase;
  const viewer = ctx.viewer;
  const viewerAdminProfile = ctx.viewerAdmin;
  const listingNumber = ctx.listingNumber;
  if (!env || !supabase || !ctx.detail) {
    notFound();
  }

  const { listing, access: detailAccess } = ctx.detail;
  const expectedSeoPath = buildListingSeoPath(
    listing.listing_number != null ? String(listing.listing_number) : listingNumber,
    typeof listing.title === "string" ? listing.title : null
  );

  const isSuspendedOwnerView = detailAccess === "suspended_owner";
  const isSuspendedAdminView = detailAccess === "suspended_admin";
  const isSuspendedDetailView = isSuspendedOwnerView || isSuspendedAdminView;

  const id = listing.id as string | undefined;
  const row = listing as Record<string, unknown>;
  const sellerUserId = listing.user_id ? String(listing.user_id) : "";
  const showPublicChat =
    detailAccess === "public" && !!id && !!sellerUserId && !!viewer?.id;
  const needCityLookup =
    !(listing.city_name != null && String(listing.city_name).trim()) &&
    !!listing.city_id;
  const brandModelFk = pick(row, ["vehicle_brand_model_id", "brand_model_id"]);
  const packageId = pick(row, ["vehicle_engine_package_id"]) as string | undefined;
  const rawVehicleModel = listing.vehicle_model as string | null | undefined;

  const [
    cities,
    categories,
    statsPair,
    priceRating,
    priceHistory,
    seller,
    adminProfile,
    brandName,
    galleryUrls,
    seriCode,
    listingPublicComments,
    viewerProfile,
    hierarchyLabels,
    catalogParts,
  ] = await Promise.all([
    needCityLookup ? fetchCities(supabase) : Promise.resolve([]),
    fetchCategories(supabase),
    id
      ? Promise.all([
          fetchListingPublicStatsMap(supabase, [id]),
          getSessionAndFavoriteSet(supabase, [id]),
        ])
      : Promise.resolve([
          new Map(),
          { user: null, favoriteIds: new Set<string>() },
        ] as const),
    id
      ? fetchPriceRatingSummary(supabase, id, viewer?.id ?? null)
      : Promise.resolve(EMPTY_PRICE_RATING_SUMMARY),
    id ? fetchListingPriceHistory(supabase, id) : Promise.resolve([]),
    sellerUserId ? fetchProfilePublic(supabase, sellerUserId) : Promise.resolve(null),
    sellerUserId
      ? fetchAdminProfileByUserId(supabase, sellerUserId)
      : Promise.resolve(null),
    listing.vehicle_brand_id
      ? fetchVehicleBrandName(supabase, String(listing.vehicle_brand_id))
      : Promise.resolve(null),
    collectListingGalleryUrlsWithStorageFallback(
      supabase,
      env,
      row,
      listing.image_url as string | null
    ),
    brandModelFk != null && String(brandModelFk).trim() !== ""
      ? fetchVehicleBrandModelSeriCode(supabase, String(brandModelFk))
      : Promise.resolve(null),
    showPublicChat
      ? fetchListingPublicComments(supabase, id!, sellerUserId)
      : Promise.resolve([]),
    viewer?.id ? fetchProfilePublic(supabase, viewer.id) : Promise.resolve(null),
    packageId
      ? fetchListingEnginePackageLabels(supabase, String(packageId))
      : Promise.resolve({
          motor: null,
          paket: null,
          horsepower: null,
          engineCapacityCc: null,
        }),
    !packageId
      ? resolveListingVehicleCatalogParts(supabase, {
          brandId: listing.vehicle_brand_id,
          rawModel: rawVehicleModel,
        })
      : Promise.resolve({
          model: null,
          motor: null,
          paket: null,
          horsepower: null,
          engineCapacityCc: null,
          variantRemainder: null,
        }),
  ]);

  const [statsMap, sessionFav] = statsPair;
  const stats = id ? statsMap.get(id) : undefined;

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

  const listingDateLabel = fmtListingDate(row.created_at);
  const priceLabel =
    listing.price != null
      ? new Intl.NumberFormat("tr-TR", {
          style: "currency",
          currency: "TRY",
          maximumFractionDigits: 0,
        }).format(Number(listing.price))
      : "Fiyat sorunuz";

  const showMessageButton =
    detailAccess === "public" &&
    !!id &&
    !!sellerUserId &&
    !!listing.contact_via_message &&
    (!viewer?.id || viewer.id !== sellerUserId);
  const isOwner =
    !!viewer?.id && !!sellerUserId && viewer.id === sellerUserId;

  const num = listing.listing_number;
  const expertizRaw = row.expertiz_panels;
  const expertizPanelsParsed = parseExpertizPanels(expertizRaw);
  const expertizPanels =
    expertizPanelsParsed != null
      ? mergeExpertizWithDefaults(expertizPanelsParsed)
      : null;

  let seriDisplay: string | undefined;
  let modelDisplay: string | undefined;
  if (brandModelFk != null && String(brandModelFk).trim() !== "") {
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

  const viewerDisplayName = viewer
    ? viewerAdminProfile?.display_name?.trim() ||
      displayNameFromAuthUser(viewer, viewerProfile)
    : null;
  const viewerAvatarRaw = sanitizeUserAvatarUrl(
    viewerProfile && typeof viewerProfile.avatar_url === "string"
      ? viewerProfile.avatar_url
      : null
  );
  const viewerAvSrc = viewerAvatarRaw
    ? viewerAvatarRaw.startsWith("http")
      ? viewerAvatarRaw
      : resolveListingImageUrl(env, viewerAvatarRaw)
    : null;

  const rawDesc =
    typeof listing.description === "string" ? listing.description : "";
  const descSpecs = rawDesc.trim()
    ? parseDescriptionVehicleSpecs(rawDesc)
    : {};
  const equipmentLines = rawDesc.trim() ? extractEquipmentLines(rawDesc) : [];

  if (!seriDisplay?.trim() && descSpecs.seriModel) {
    const parts = descSpecs.seriModel.trim().split(/\s+/);
    seriDisplay = parts[0] || descSpecs.seriModel;
    if (!modelDisplay && parts.length > 1) {
      modelDisplay = parts.slice(1).join(" ");
    }
  }

  const descBody = rawDesc.trim() ? extractDescriptionBody(rawDesc) : "";
  const descriptionTabContent =
    !rawDesc.trim() ? (
      <p className="text-base text-black/55">Açıklama yok.</p>
    ) : !descBody ? (
      <p className="text-base text-black/55">
        Ayrı açıklama metni yok; teknik bilgiler Genel Bilgiler ve Donanım
        sekmelerinde.
      </p>
    ) : (
      <ListingDescriptionText text={descBody} />
    );

  const motorNote = pick(row, ["engine_note", "motor_note"]) as string | undefined;
  const paketNote = pick(row, ["package_note", "paket_note"]) as string | undefined;
  const kasaNote = pick(row, ["body_note", "kasa_note"]) as string | undefined;

  const motorDisplay =
    motorNote?.trim() ||
    hierarchyLabels.motor ||
    catalogParts.motor ||
    descSpecs.motor ||
    labelFromEquipmentLines(equipmentLines, "Motor") ||
    strCell(pick(row, ["engine_name", "motor_name", "engine_label"]));
  const paketDisplay =
    paketNote?.trim() ||
    hierarchyLabels.paket ||
    catalogParts.paket ||
    descSpecs.paket ||
    labelFromEquipmentLines(equipmentLines, "Paket") ||
    strCell(pick(row, ["package_name", "paket_name", "package_label"]));

  const legacyModelForDisplay = resolveListingModelDisplay({
    trimModel: modelDisplay,
    motor: motorDisplay,
    paket: paketDisplay,
    vehicleModel: listing.vehicle_model as string | null | undefined,
    seri: seriDisplay,
  });
  const strippedModel = stripKnownParts(rawVehicleModel, [
    motorDisplay,
    paketDisplay,
    legacyModelForDisplay,
  ]);
  const modelForDisplay =
    catalogParts.model ||
    seriDisplay ||
    (strippedModel && strippedModel !== rawVehicleModel?.trim()
      ? strippedModel
      : inferModelOnlyFromVehicleModel(rawVehicleModel)) ||
    legacyModelForDisplay;
  const detailVehicleSeries = formatListingSeriesLine({
    engine: motorDisplay,
    package: paketDisplay,
    variantRemainder: catalogParts.variantRemainder,
    rawModel: rawVehicleModel,
    resolvedModel: modelForDisplay,
  });

  const kasaDisplay =
    listing.body_type?.toString().trim() ||
    kasaNote?.trim() ||
    descSpecs.kasa;

  const vehicleConditionFromDesc = firstSpecLine(rawDesc, [
    "Araç durumu",
    "Araç Durumu",
  ]);
  const warrantyFromDesc = firstSpecLine(rawDesc, ["Garanti"]);
  const heavyDamageFromDesc = firstSpecLine(rawDesc, [
    "Ağır hasar kayıtlı",
    "Ağır hasar kaydı",
    "Ağır hasar",
  ]);
  const plateNationalityFromDesc = firstSpecLine(rawDesc, [
    "Plaka/Uyruk",
    "Plaka / Uyruk",
    "Uyruk",
    "Plaka",
  ]);
  const vehiclePlate = strCell(
    pick(row, ["vehicle_plate", "plate_number", "plaka", "license_plate"])
  );
  const engineCapacityDisplay = fmtEngineCapacity(
    pick(row, [
      "vehicle_engine_cc",
      "engine_capacity",
      "motor_hacmi",
      "engine_cc",
    ]) ?? hierarchyLabels.engineCapacityCc ?? catalogParts.engineCapacityCc
  );
  const enginePowerDisplay = fmtHorsepower(
    pick(row, [
      "vehicle_engine_hp",
      "engine_power",
      "motor_gucu",
      "motor_power",
    ]) ?? hierarchyLabels.horsepower ?? catalogParts.horsepower
  );

  const vehicleSpecRows = compactRows([
    specRow("İlan No", num != null ? `#${String(num)}` : null),
    specRow("Konum", cityDisplayResolved),
    specRow("Marka", brandName),
    specRow("Model", modelForDisplay),
    isMotorcycle
      ? specRow("CC", engineCapacityDisplay)
      : specRow("Seri", detailVehicleSeries),
    specRow("Üretim yılı", listing.vehicle_year as number | null),
    specRow(
      "Kilometre",
      fmtKm(listing.vehicle_mileage ?? pick(row, ["km"]))
    ),
    specRow("Yakıt", listing.fuel_type as string),
    specRow(isMotorcycle ? "Şanzıman" : "Vites", listing.transmission_type as string),
    !isMotorcycle ? specRow("Motor hacmi", engineCapacityDisplay) : null,
    specRow("Motor gücü (HP)", enginePowerDisplay),
    specRow(isMotorcycle ? "Renk / Kaplama" : "Renk", listing.color as string),
    specRow("Kasa tipi", kasaDisplay),
    specRow("Çekiş", listing.drive_type as string),
    specRow("Araç durumu", vehicleConditionFromDesc),
    specRow("Garanti", warrantyFromDesc),
    specRow("Ağır hasar kayıtlı", heavyDamageFromDesc),
    specRow("Plaka/Uyruk", plateNationalityFromDesc),
    specRow("Plaka", vehiclePlate),
    specRow(
      isMotorcycle ? "Ekspertiz / kontrol raporu" : "Ekspertiz raporu",
      listing.has_expertise === true
        ? "Var"
        : listing.has_expertise === false
          ? "Yok"
          : null
    ),
    specRow(
      "Hasarlı",
      listing.is_damaged === true
        ? "Evet"
        : listing.is_damaged === false
          ? "Hayır"
          : null
    ),
    specRow(
      "Takaslı",
      listing.is_tradeable === true
        ? "Evet"
        : listing.is_tradeable === false
          ? "Hayır"
          : null
    ),
  ]);

  const vehicleBreadcrumb = [
    categoryName?.trim(),
    brandName?.trim(),
    modelForDisplay?.trim(),
    detailVehicleSeries?.trim(),
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
  const showContactDock =
    !!seller &&
    !isOwner &&
    (showMessageButton || showPhone);

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
          model: modelForDisplay ?? seriDisplay ?? null,
          vehicleYear: Number.isFinite(vehicleYear) ? vehicleYear : null,
          mileageKm: Number.isFinite(mileageKm) ? mileageKm : null,
          city: cityDisplayResolved ?? null,
          fuelType: fuelType ?? null,
          transmission: transmission ?? null,
        })
      : null;

  return (
    <article
      className={`mx-auto w-full max-w-[1400px] flex-1 bg-white px-0 pt-0 text-black md:px-6 md:pb-12 md:pt-4 ${
        showContactDock ? "pb-24" : "pb-12"
      } ${
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
          className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-950 md:mx-0"
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
          className="mx-4 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 md:mx-0"
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

      <div className="listing-detail-layout">
        <div className="listing-detail-gallery min-w-0">
          <div className="overflow-hidden bg-white md:rounded-xl md:border md:border-black/10">
            <ListingImageGallery
              images={galleryUrls}
              alt="İlan görseli"
              compact
              edgeToEdge
              overlay={
                <div className="flex w-full items-start justify-between gap-2">
                  <ListingBackButton />
                  <div className="flex items-center gap-1.5">
                    {id && !isSuspendedDetailView ? (
                      <FavoriteHeart
                        listingId={id}
                        initialFavorited={sessionFav.favoriteIds.has(id)}
                        loggedIn={!!sessionFav.user}
                        variant="overlay"
                      />
                    ) : null}
                    {id && detailAccess === "public" ? (
                      <ListingShareReportActions
                        listingId={id}
                        shareTitle={(listing.title as string) ?? "İlan"}
                        sharePath={
                          expectedSeoPath ??
                          `/ilan/${encodeURIComponent(listingNumber)}`
                        }
                        loggedIn={!!viewer}
                        canReport={
                          !!viewer?.id &&
                          !!sellerUserId &&
                          viewer.id !== sellerUserId
                        }
                        variant="overlay"
                      />
                    ) : null}
                    {isOwner ? (
                      <Link
                        href={`/ilan-duzenle/${encodeURIComponent(listingNumber)}`}
                        aria-label="İlanı düzenle"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60"
                      >
                        <EditIcon />
                      </Link>
                    ) : null}
                    {viewerAdminProfile && id && detailAccess === "public" ? (
                      <SuspendListingButton
                        listingId={id}
                        listingLabel={`#${String(num ?? "?")} — ${String(listing.title ?? "İlan")}`}
                        variant="overlay"
                      />
                    ) : null}
                  </div>
                </div>
              }
            />
          </div>
        </div>

        <div className="listing-detail-intro min-w-0 space-y-2 px-4 md:px-0">
          {vehicleBreadcrumb.length > 0 ? (
            <nav
              className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-black/70"
              aria-label="Kategori ve model"
            >
              {vehicleBreadcrumb.map((part, i) => (
                <span key={`${part}-${i}`} className="inline-flex items-center">
                  {i > 0 ? (
                    <span className="mx-1 font-medium text-black/35" aria-hidden>
                      &gt;
                    </span>
                  ) : null}
                  <span className="font-medium text-black/85">{part}</span>
                </span>
              ))}
            </nav>
          ) : null}
          <h1 className="text-xl font-bold leading-tight text-black sm:text-2xl">
            {(listing.title as string) ?? "İlan"}
          </h1>
          {(num != null || cityDisplayResolved || listingDateLabel) ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-black/65">
              {num != null ? (
                <CopyListingNumber
                  text={`#${String(num)}`}
                  className="font-semibold text-blue-600"
                />
              ) : null}
              {cityDisplayResolved ? (
                <span className="font-medium text-black/75">{cityDisplayResolved}</span>
              ) : null}
              {listingDateLabel ? (
                <span className="text-black/55">{listingDateLabel}</span>
              ) : null}
            </p>
          ) : null}
          {id ? (
            <ListingDetailStatsRow
              listingId={id}
              initialFavorites={stats?.favorites ?? 0}
              priceLabel={priceLabel}
              summary={priceRating}
              loggedIn={!!viewer}
              priceHistory={priceHistory}
            />
          ) : (
            <p className="text-sm font-bold tabular-nums text-black">{priceLabel}</p>
          )}
        </div>

        <div className="listing-detail-tabs min-w-0 px-4 md:px-0">
          <ListingDetailTabs
            infoContent={<ListingVehicleSpecs rows={vehicleSpecRows} />}
            descriptionContent={descriptionTabContent}
            equipmentContent={equipmentTabContent}
          />
          {expertizPanels ? (
            <section className="mt-4">
              <h2 className="mb-3 text-lg font-semibold text-black">
                Ekspertiz bilgileri
              </h2>
              <ExpertizDiagram panels={expertizPanels} />
            </section>
          ) : expertizRaw != null ? (
            <section className="mt-4 rounded-lg border border-black/15 bg-white p-4 text-sm text-black">
              Ekspertiz verisi tanınmadı; ham veri aşağıda. Şema ile
              eşleşmesi için panelleri JSON veya beklenen anahtarlarla kaydedin.
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
        </div>

        <div className="listing-detail-aside min-w-0 px-4 md:px-0">
          <div className="shrink-0 rounded-xl border border-black/10 bg-white p-3">
            {seller ? (
              <>
                <p className="mb-2 hidden text-[10px] font-semibold uppercase tracking-wide text-black/50 md:block">
                  Satıcı
                </p>
                <Link
                  href={`/kullanici/${sellerUserId}`}
                  className="hidden items-center gap-2 rounded-lg transition hover:bg-black/[0.03] md:flex"
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
                {stats && id ? (
                  <div className="hidden md:block">
                    <ListingDetailSellerStats
                      listingId={id}
                      initialViews={stats.views}
                      initialFavorites={stats.favorites}
                    />
                  </div>
                ) : null}
                {showMessageButton && id ? (
                  <div className="mt-3 hidden gap-2 md:flex">
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
                  <div className="mt-3 hidden md:block">
                    <ListingContactPhone phone={contactPhone} />
                  </div>
                ) : null}
                <div className="md:mt-3 md:border-t md:border-black/10 md:pt-3">
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
          {showPublicChat && id ? (
            <ListingPublicChatPanelLoader
              listingId={id}
              listingPath={expectedSeoPath ?? `/ilan/${listingNumber}`}
              sellerUserId={sellerUserId}
              initialComments={listingPublicComments}
              viewerId={viewer?.id ?? null}
              viewerName={viewerDisplayName}
              viewerAvatarUrl={viewerAvSrc}
              canPost
            />
          ) : null}
          <AdSenseUnit
            slot={ADSENSE_LISTING_DETAIL_SLOT}
            className="mt-3 hidden lg:block"
            label="Sponsorlu"
          />
        </div>
      </div>
      {showContactDock && sellerUserId ? (
        <ListingDetailContactDock
          sellerUserId={sellerUserId}
          sellerDisplayName={sellerDisplayName}
          sellerAvSrc={sellerAvSrc}
          verified={!!adminProfile}
          listingId={id}
          showMessage={showMessageButton}
          showPhone={showPhone}
          phone={contactPhone}
        />
      ) : null}
    </article>
  );
}

function EditIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-4 w-4"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
      />
    </svg>
  );
}
