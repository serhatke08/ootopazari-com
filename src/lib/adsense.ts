export const ADSENSE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT?.trim() ||
  "ca-pub-6962376212093267";

export const ADSENSE_HOME_SLOT =
  process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_HOME_SLOT?.trim() || "";

export const ADSENSE_LISTING_DETAIL_SLOT =
  process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_LISTING_DETAIL_SLOT?.trim() || "";
