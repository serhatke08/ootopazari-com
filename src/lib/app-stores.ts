const IOS_APP_URL =
  "https://apps.apple.com/tr/app/oto-ara%C3%A7-pazar%C4%B1/id6760130978?l=tr";

const ANDROID_APP_URL =
  "https://play.google.com/store/search?q=Oto%20Ara%C3%A7%20Pazar%C4%B1&c=apps";

/** App Store / Play Store — env varsa o, yoksa uygulama sayfası. */
export function appStoreUrl(): string {
  return process.env.NEXT_PUBLIC_IOS_APP_URL?.trim() || IOS_APP_URL;
}

export function playStoreUrl(): string {
  return process.env.NEXT_PUBLIC_ANDROID_APP_URL?.trim() || ANDROID_APP_URL;
}
