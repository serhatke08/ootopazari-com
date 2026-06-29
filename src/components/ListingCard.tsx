import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { isListingSuspended, type ListingRow } from "@/lib/listings-data";
import type { ListingPublicStats } from "@/lib/listing-stats";
import type { SupabasePublicEnv } from "@/lib/env";
import { buildListingSeoPath } from "@/lib/listing-seo";
import { FavoriteHeart } from "@/components/FavoriteHeart";
import { ListingBoostChrome } from "@/components/ListingBoostChrome";
import { ListingCoverImage } from "@/components/ListingCoverImage";
import { ListingPriceDisplay } from "@/components/ListingPriceDisplay";
import { StatsBadges } from "@/components/StatsBadges";
import { listingHomeBoostChromeActive } from "@/lib/listing-feature-boost";
import type { PriceRatingSummary } from "@/lib/listing-price-ratings";
import { EMPTY_PRICE_RATING_SUMMARY } from "@/lib/listing-price-ratings";

type Props = {
  listing: ListingRow;
  env: SupabasePublicEnv;
  categoryName?: string | null;
  stats?: ListingPublicStats | null;
  loggedIn?: boolean;
  favorited?: boolean;
  /** Ana sayfa: kategori satırı ve araç yılı gösterilmez */
  hideCategoryAndYear?: boolean;
  /** Ana sayfa: şehir görüntüleme/favori satırının sağında; diğer sayfalarda üstteki şehir·yıl satırında */
  cityOnStatsRow?: boolean;
  /** `city_id` ile çözümlenmiş şehir adı (opsiyonel; `city_name` boşsa kullanılır) */
  cityDisplayName?: string | null;
  /** Örn. «İlanlarım»: kart altında düzenle / sil */
  ownerActions?: ReactNode;
  /** Askıya alınmış ilan: soluk görünüm + etiket */
  suspended?: boolean;
  suspensionReason?: string | null;
  /** Kartta görsel altında küçük profil satırı. */
  ownerName?: string | null;
  ownerAvatarSrc?: string | null;
  ownerHref?: string | null;
  priceRating?: PriceRatingSummary;
};

function formatMaskedMileage(value: unknown): string | null {
  if (value == null || value === "") return null;
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return null;
  const mileage = Number(digits);
  if (!Number.isFinite(mileage) || mileage < 0) return null;
  if (mileage === 0) return "0 km";
  const thousands = Math.floor(mileage / 1000);
  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(thousands)}.xxx km`;
}

function LocationPinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className ?? "h-[11px] w-[11px]"}
      aria-hidden
    >
      <path d="M12 2.25c-3.87 0-7 3.13-7 7 0 5.25 7 12.5 7 12.5s7-7.25 7-12.5c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
    </svg>
  );
}

function SpeedIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className ?? "h-[11px] w-[11px]"}
      aria-hidden
    >
      <path
        d="M4.2 17.8a8.8 8.8 0 1 1 15.6 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="m12 14 4.2-5.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M7.2 18h9.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function ListingCard({
  listing,
  env,
  categoryName,
  stats,
  loggedIn = false,
  favorited = false,
  hideCategoryAndYear = false,
  cityOnStatsRow = false,
  cityDisplayName,
  ownerActions,
  suspended: suspendedProp,
  suspensionReason,
  ownerName,
  ownerAvatarSrc,
  ownerHref,
  priceRating,
}: Props) {
  const ratingSummary = priceRating ?? EMPTY_PRICE_RATING_SUMMARY;
  const suspended =
    suspendedProp ?? isListingSuspended(listing);
  const boostActive =
    !suspended && listingHomeBoostChromeActive(listing);
  const cityText =
    (cityDisplayName != null && String(cityDisplayName).trim() !== ""
      ? String(cityDisplayName).trim()
      : null) ??
    (listing.city_name != null && String(listing.city_name).trim() !== ""
      ? String(listing.city_name).trim()
      : null);

  const num = listing.listing_number;
  const href = buildListingSeoPath(
    num != null ? String(num) : null,
    typeof listing.title === "string" ? listing.title : null
  );
  const listingId = listing.id;
  const hasImage = Boolean(listing.image_url);
  const price =
    listing.price != null
      ? `${new Intl.NumberFormat("tr-TR", {
          maximumFractionDigits: 0,
        }).format(Number(listing.price))} TL`
      : "Fiyat sorunuz";

  /** Ana sayfa / filtre sonuçları grid’i: daha yüksek görsel + fiyat görsel üzerinde */
  const isHomeGrid = hideCategoryAndYear && cityOnStatsRow;
  const maskedMileage = formatMaskedMileage(listing.vehicle_mileage);

  const imageFrame = (
    <div
      className={
        isHomeGrid
          ? "relative aspect-square w-full overflow-hidden bg-white"
          : "relative aspect-[3/2] w-full overflow-hidden bg-black sm:aspect-[16/10]"
      }
    >
      {listingId ? (
        <div className="absolute right-2 top-2 z-10">
          <FavoriteHeart
            listingId={listingId}
            initialFavorited={favorited}
            loggedIn={loggedIn}
          />
        </div>
      ) : null}
      {hasImage ? (
        <ListingCoverImage
          env={env}
          imageUrl={listing.image_url}
          alt={listing.title ?? "İlan görseli"}
          objectFit={isHomeGrid ? "cover" : "contain"}
          scale={!isHomeGrid}
          sizes="(max-width: 639px) 50vw, (max-width: 1279px) 25vw, 20vw"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          Görsel yok
        </div>
      )}
    </div>
  );

  const imageArea = isHomeGrid ? (
    <div className="relative">
      {boostActive ? <ListingBoostChrome /> : null}
      {href ? <Link href={href}>{imageFrame}</Link> : imageFrame}
    </div>
  ) : (
    imageFrame
  );

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md sm:rounded-xl ${
        suspended ? "opacity-[0.72] grayscale-[0.35]" : ""
      }`}
    >
      {suspended ? (
        <div className="border-b border-red-100 bg-red-50 px-2 py-1.5 sm:px-4">
          <p className="text-center text-[10px] font-bold uppercase tracking-wide text-red-700 sm:text-[11px]">
            Askıya alındı
          </p>
          {suspensionReason != null && String(suspensionReason).trim() !== "" ? (
            <p className="mt-0.5 line-clamp-2 text-center text-[10px] text-red-800/90 sm:text-[11px]">
              {String(suspensionReason).trim()}
            </p>
          ) : null}
        </div>
      ) : null}
      {href && !isHomeGrid ? <Link href={href}>{imageArea}</Link> : imageArea}
      <div className="flex flex-1 flex-col gap-1 p-2 sm:gap-1.5 sm:p-3">
        {ownerName ? (
          ownerHref ? (
            <Link
              href={ownerHref}
              className="-mt-2 mb-0.5 inline-flex min-w-0 items-center gap-1 text-zinc-500 hover:text-zinc-800"
            >
              <span className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full bg-zinc-200">
                {ownerAvatarSrc ? (
                  <Image
                    src={ownerAvatarSrc}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="16px"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[9px] font-semibold text-zinc-600">
                    {ownerName.trim().slice(0, 1).toUpperCase() || "?"}
                  </span>
                )}
              </span>
              <span className="truncate text-[10px] font-medium leading-none">{ownerName}</span>
            </Link>
          ) : (
            <div className="-mt-2 mb-0.5 inline-flex min-w-0 items-center gap-1 text-zinc-500">
              <span className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full bg-zinc-200">
                {ownerAvatarSrc ? (
                  <Image
                    src={ownerAvatarSrc}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="16px"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[9px] font-semibold text-zinc-600">
                    {ownerName.trim().slice(0, 1).toUpperCase() || "?"}
                  </span>
                )}
              </span>
              <span className="truncate text-[10px] font-medium leading-none">{ownerName}</span>
            </div>
          )
        ) : null}
        {!hideCategoryAndYear && categoryName ? (
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400 sm:text-[11px]">
            {categoryName}
          </p>
        ) : null}
        {href ? (
          <Link
            href={href}
            className="line-clamp-2 min-h-[1.85rem] text-[11px] font-semibold leading-snug text-zinc-900 sm:min-h-[2.2rem] sm:text-[13px]"
          >
            {listing.title ?? "Başlıksız ilan"}
          </Link>
        ) : (
          <p className="line-clamp-2 min-h-[1.85rem] text-[11px] font-semibold text-zinc-500 sm:min-h-[2.2rem] sm:text-[13px]">
            {listing.title ?? "Başlıksız ilan"} (ilan no eksik)
          </p>
        )}
        {isHomeGrid && listingId ? (
          <div className="flex min-w-0 items-center gap-x-0.5">
            <ListingPriceDisplay
              listingId={listingId}
              priceLabel={price}
              summary={ratingSummary}
              loggedIn={loggedIn}
              dotSize="sm"
            />
          </div>
        ) : isHomeGrid ? (
          <p className="text-[13px] font-bold text-emerald-700 tabular-nums leading-tight sm:text-[15px]">
            {price}
          </p>
        ) : null}
        {!isHomeGrid ? (
          listingId ? (
            <ListingPriceDisplay
              listingId={listingId}
              priceLabel={price}
              summary={ratingSummary}
              loggedIn={loggedIn}
            />
          ) : (
            <p className="text-sm font-bold text-emerald-700 sm:text-base md:text-lg">
              {price}
            </p>
          )
        ) : null}
        {!stats ? (
          <div className="mt-0 flex flex-wrap items-center gap-x-1.5 gap-y-0 text-[10px] text-zinc-500 sm:mt-0.5 sm:gap-x-1.5 sm:text-[10px]">
            {cityText ? <span>{cityText}</span> : null}
            {!hideCategoryAndYear && listing.vehicle_year != null ? (
              <>
                {cityText ? (
                  <span className="text-zinc-400">·</span>
                ) : null}
                <span>{String(listing.vehicle_year)}</span>
              </>
            ) : null}
          </div>
        ) : stats && !cityOnStatsRow ? (
          <div className="mt-0 flex flex-wrap items-center gap-x-1.5 gap-y-0 text-[10px] text-zinc-500 sm:mt-0.5 sm:gap-x-1.5 sm:text-[10px]">
            {cityText ? <span>{cityText}</span> : null}
            {!hideCategoryAndYear && listing.vehicle_year != null ? (
              <>
                {cityText ? (
                  <span className="text-zinc-400">·</span>
                ) : null}
                <span>{String(listing.vehicle_year)}</span>
              </>
            ) : null}
          </div>
        ) : !hideCategoryAndYear && listing.vehicle_year != null ? (
          <div className="mt-0 text-[10px] text-zinc-500 sm:mt-0.5 sm:text-[10px]">
            {String(listing.vehicle_year)}
          </div>
        ) : null}
        {stats ? (
          isHomeGrid ? (
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2 text-[11px] text-zinc-500 max-sm:mt-1 max-sm:pt-1.5 max-sm:text-[10px]">
              {cityText ? (
                <span
                  className="inline-flex min-w-0 flex-1 items-center gap-0.5 text-left text-[10px] font-medium leading-tight text-zinc-600 max-sm:text-[9px]"
                  title="Şehir"
                >
                  <LocationPinIcon className="h-[11px] w-[11px] shrink-0 text-zinc-600" />
                  <span className="truncate">
                    {cityText}
                  </span>
                </span>
              ) : (
                <span className="min-w-0 flex-1" aria-hidden />
              )}
              <span
                className="inline-flex shrink-0 items-center justify-end gap-0.5 text-right font-semibold tabular-nums text-zinc-700"
                title="Kilometre"
              >
                <SpeedIcon className="h-[11px] w-[11px] shrink-0 text-zinc-700" />
                <span>
                  {maskedMileage ?? "Km belirtilmedi"}
                </span>
              </span>
            </div>
          ) : (
            <StatsBadges
              variant="card"
              views={stats.views}
              favorites={stats.favorites}
              rightSlot={
                cityOnStatsRow && cityText ? cityText : undefined
              }
            />
          )
        ) : null}
        {ownerActions ? (
          <div className="mt-2 flex flex-wrap gap-2 border-t border-zinc-100 pt-2">
            {ownerActions}
          </div>
        ) : null}
      </div>
    </article>
  );
}
