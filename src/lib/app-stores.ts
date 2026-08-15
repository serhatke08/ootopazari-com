/** App Store / Play Store — gerçek linkler env’den; yoksa mağaza araması. */
export function appStoreUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_IOS_APP_URL?.trim();
  if (fromEnv) return fromEnv;
  return "https://apps.apple.com/search?term=Oto%20Pazar%C4%B1";
}

export function playStoreUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ANDROID_APP_URL?.trim();
  if (fromEnv) return fromEnv;
  return "https://play.google.com/store/search?q=Oto%20Pazar%C4%B1&c=apps";
}
