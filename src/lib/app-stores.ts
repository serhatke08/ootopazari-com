const IOS_APP_URL =
  "https://apps.apple.com/tr/app/oto-ara%C3%A7-pazar%C4%B1/id6760130978?l=tr";

const ANDROID_APP_URL =
  "https://play.google.com/store/apps/details?id=com.partridge.otomobile&pcampaignid=web_share";

/** App Store / Play Store — env varsa o, yoksa uygulama sayfası. */
export function appStoreUrl(): string {
  return process.env.NEXT_PUBLIC_IOS_APP_URL?.trim() || IOS_APP_URL;
}

export function playStoreUrl(): string {
  return process.env.NEXT_PUBLIC_ANDROID_APP_URL?.trim() || ANDROID_APP_URL;
}

export type MobileStoreKind = "ios" | "android" | "other";

export function detectMobileStore(ua: string): MobileStoreKind {
  const s = ua.toLowerCase();
  if (/iphone|ipad|ipod/.test(s)) return "ios";
  // iPadOS 13+ bazen Macintosh olarak görünür
  if (/macintosh/.test(s) && typeof navigator !== "undefined" && "maxTouchPoints" in navigator) {
    try {
      if ((navigator as Navigator).maxTouchPoints > 1) return "ios";
    } catch {
      /* ignore */
    }
  }
  if (/android/.test(s)) return "android";
  return "other";
}

export function storeUrlForKind(kind: MobileStoreKind): string {
  if (kind === "ios") return appStoreUrl();
  if (kind === "android") return playStoreUrl();
  return playStoreUrl();
}

export function storeLabelForKind(kind: MobileStoreKind): string {
  if (kind === "ios") return "App Store’dan indir";
  if (kind === "android") return "Google Play’den indir";
  return "Uygulamayı indir";
}
