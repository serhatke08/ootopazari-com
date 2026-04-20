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
import { getSessionAndFavoriteSet } from "@/lib/favorites";
import { collectListingGalleryUrlsWithStorageFallback } from "@/lib/listing-images";
import {
  buildListingSeoPath,
  extractListingNumberFromSeoParam,
} from "@/lib/listing-seo";
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
      ? listing.description.slice(0, 155)
      : `${title}${city ? ` — ${city}` : ""}`;
  const imageRaw = typeof listing.image_url === "string" ? listing.image_url : null;
  const imageUrl = imageRaw ? resolveListingImageUrl(env, imageRaw) : null;
  const canonicalPath =
    buildListingSeoPath(
      listing.listing_number != null ? String(listing.listing_number) : listingNumber,
      typeof listing.title === "string" ? listing.title : title
    ) ?? `/ilan/${encodeURIComponent(listingNumber)}`;
  return {
    title,
    description: desc,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description: desc,
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
      title,
      description: desc,
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
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-black/10 py-2.5 last:border-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-black/55">
        {label}
      </dt>
      <dd
        className={`min-w-0 text-right text-sm font-medium ${valueClassName}`}
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
  if (!detail) notFound();

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

  const sellerUserId = listing.user_id ? String(listing.user_id) : "";
  const canMessageSeller =
    detailAccess === "public" &&
    !!viewer?.id &&
    !!id &&
    !!sellerUserId &&
    viewer.id !== sellerUserId &&
    !!listing.contact_via_message;

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
  const descStripped = rawDesc.trim()
    ? stripDuplicateVehicleSpecLines(rawDesc)
    : "";
  const descriptionBlock =
    !rawDesc.trim() ? (
      <p className="text-sm text-black/55">Açıklama yok.</p>
    ) : !descStripped.trim() ? null : (
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-black">
        {descStripped}
      </p>
    );

  const suspensionReason =
    listing.suspension_reason != null
      ? String(listing.suspension_reason).trim()
      : "";

  return (
    <article
      className={`mx-auto w-full max-w-[1400px] flex-1 bg-white px-4 pb-12 pt-4 text-black sm:px-6 ${
        isSuspendedDetailView ? "opacity-[0.88] grayscale-[0.15]" : ""
      }`}
    >
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
          <span className="text-xs text-black/60">
            İlan no:{" "}
            {num != null ? (
              <CopyListingNumber
                text={`#${String(num)}`}
                className="font-semibold text-blue-600 tabular-nums"
              />
            ) : (
              "—"
            )}
          </span>
        </div>
        {viewerAdminProfile && id && detailAccess === "public" ? (
          <SuspendListingButton
            listingId={id}
            listingLabel={`#${String(num ?? "?")} — ${String(listing.title ?? "İlan")}`}
          />
        ) : null}
      </div>

      <div className="space-y-6 sm:space-y-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-[minmax(0,60%)_minmax(0,1fr)] sm:items-start sm:gap-x-8 lg:gap-x-10">
        <div className="min-w-0 space-y-3">
          <ListingImageGallery
            images={galleryUrls}
            alt="İlan görseli"
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
          {seller ? (
            <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3">
              {sellerAvSrc ? (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-black/5">
                  <Image
                    src={sellerAvSrc}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 object-cover"
                  />
                </div>
              ) : (
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/10 text-base font-semibold text-black/55"
                  aria-hidden
                >
                  {(sellerDisplayName ?? "?").trim().slice(0, 1).toUpperCase() ||
                    "?"}
                </div>
              )}
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <p className="truncate text-base font-semibold leading-tight text-black">
                  {sellerDisplayName}
                </p>
                {adminProfile ? <AdminVerifiedBadge /> : null}
              </div>
            </div>
          ) : null}

          <div
            className={
              seller
                ? "space-y-3 border-t border-black/10 pt-4 sm:border-t-0 sm:pt-0"
                : "space-y-3"
            }
          >
            <h2 className="min-w-0 text-2xl font-semibold leading-snug text-black sm:text-3xl">
              {(listing.title as string) ?? "İlan"}
            </h2>
            {listing.price != null ? (
              <p className="text-2xl font-bold text-black tabular-nums sm:text-3xl">
                {new Intl.NumberFormat("tr-TR", {
                  style: "currency",
                  currency: "TRY",
                  maximumFractionDigits: 0,
                }).format(Number(listing.price))}
              </p>
            ) : (
              <p className="text-lg text-black/70 sm:text-xl">Fiyat sorunuz</p>
            )}
            {stats ? (
              <StatsBadges
                variant="inline"
                views={stats.views}
                favorites={stats.favorites}
              />
            ) : null}
            {descriptionBlock}
          </div>
        </div>

        <div className="min-w-0">
          <dl className="rounded-xl border border-black/10 bg-white px-4 py-1">
            {num != null ? (
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-black/10 py-2.5 last:border-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-black/55">
                  İlan no
                </dt>
                <dd className="min-w-0 text-right text-sm font-medium">
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
            <Field
              label="İlan tarihi"
              value={fmtListingDate(row.created_at) ?? "—"}
            />
            <Field label="Marka" value={brandName ?? undefined} />
            <Field label="Seri" value={seriDisplay ?? "—"} />
            <Field label="Model" value={modelDisplay ?? "—"} />
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
            {isCarLike ? (
              <Field label="Kasa tipi" value={listing.body_type as string} />
            ) : null}
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

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-black">
          Konum ve iletişim
        </h2>
        <dl className="rounded-xl border border-black/10 bg-white px-4">
          <Field label="Ülke" value={listing.country_name as string} />
          <Field label="Şehir" value={cityDisplayResolved ?? undefined} />
          <Field label="İlçe" value={listing.district as string} />
          <Field label="Telefon" value={listing.contact_phone as string} />
        </dl>
        <p className="mt-2 text-xs text-black/55">
          Mesaj veya telefon tercihleri:{" "}
          {listing.contact_via_phone ? "Telefon " : ""}
          {listing.contact_via_message ? "Uygulama içi mesaj " : ""}
          {!listing.contact_via_phone && !listing.contact_via_message
            ? "—"
            : null}
        </p>
      </section>

      {seller ? (
        <section className="mt-10 rounded-xl border border-black/10 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold text-black">Satıcı</h2>
          <div className="flex items-start gap-4">
            {sellerAvSrc ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-black/5">
                <Image
                  src={sellerAvSrc}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 object-cover"
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black/10 text-lg font-semibold text-black/55">
                {(sellerDisplayName ?? "?").trim().slice(0, 1).toUpperCase() ||
                  "?"}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-medium">{sellerDisplayName}</p>
                {adminProfile ? <AdminVerifiedBadge /> : null}
              </div>
              {seller.phone ? (
                <p className="text-sm text-black/70">{String(seller.phone)}</p>
              ) : null}
              {canMessageSeller && id ? (
                <StartConversationButton
                  listingId={id}
                  ownerUserId={sellerUserId}
                />
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}
