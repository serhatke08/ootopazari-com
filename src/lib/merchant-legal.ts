/** PayTR / mesafeli satış uyumu — sunucu ortam değişkenleri. */
export type MerchantLegalInfo = {
  legalName: string;
  /** Yalnızca yasal sözleşme sayfalarında (env ile); kamuya açık sayfalarda gösterilmez. */
  address: string;
  email: string;
  phone: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  mersis: string | null;
};

export type PublicContactInfo = {
  email: string;
  phone: string | null;
};

const DEFAULT_PUBLIC_EMAIL = "skeklik098@gmail.com";

function env(key: string): string | null {
  const v = process.env[key]?.trim();
  return v || null;
}

/** İletişim / hakkımızda — adres yok, yalnızca e-posta (+ telefon). */
export function getPublicContactInfo(): PublicContactInfo {
  // Kamuya açık e-posta sabit; Vercel’deki merchant/paytr maili buraya sızmasın.
  return {
    email: DEFAULT_PUBLIC_EMAIL,
    phone: env("MERCHANT_PHONE") ?? env("NEXT_PUBLIC_MERCHANT_PHONE"),
  };
}

export function getMerchantLegalInfo(): MerchantLegalInfo {
  const contact = getPublicContactInfo();
  return {
    legalName:
      env("MERCHANT_LEGAL_NAME") ??
      env("NEXT_PUBLIC_MERCHANT_LEGAL_NAME") ??
      "Oto Pazarı",
    // Adres env’de olsa bile kamuya açık bloklarda kullanılmaz (aşağıdaki flag).
    address:
      env("MERCHANT_ADDRESS") ??
      env("NEXT_PUBLIC_MERCHANT_ADDRESS") ??
      "",
    email: contact.email,
    phone: contact.phone,
    taxOffice: env("MERCHANT_TAX_OFFICE"),
    taxNumber: env("MERCHANT_TAX_NUMBER"),
    mersis: env("MERCHANT_MERSIS"),
  };
}

/** Açık adresin sitede gösterilmesine izin (varsayılan: kapalı). */
export function merchantAddressPublicEnabled(): boolean {
  return process.env.MERCHANT_SHOW_ADDRESS?.trim() === "1";
}

export function isPaytrTestMode(): boolean {
  return process.env.PAYTR_TEST_MODE?.trim() === "1";
}
