/** PayTR / mesafeli satış uyumu — sunucu ortam değişkenleri. */
export type MerchantLegalInfo = {
  legalName: string;
  address: string;
  email: string;
  phone: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  mersis: string | null;
};

function env(key: string): string | null {
  const v = process.env[key]?.trim();
  return v || null;
}

export function getMerchantLegalInfo(): MerchantLegalInfo {
  return {
    legalName:
      env("MERCHANT_LEGAL_NAME") ??
      env("NEXT_PUBLIC_MERCHANT_LEGAL_NAME") ??
      "Oto Pazarı",
    address:
      env("MERCHANT_ADDRESS") ??
      env("NEXT_PUBLIC_MERCHANT_ADDRESS") ??
      "",
    email:
      env("MERCHANT_EMAIL") ??
      env("NEXT_PUBLIC_MERCHANT_EMAIL") ??
      "destek@otopazari.com",
    phone: env("MERCHANT_PHONE") ?? env("NEXT_PUBLIC_MERCHANT_PHONE"),
    taxOffice: env("MERCHANT_TAX_OFFICE"),
    taxNumber: env("MERCHANT_TAX_NUMBER"),
    mersis: env("MERCHANT_MERSIS"),
  };
}

export function isPaytrTestMode(): boolean {
  return process.env.PAYTR_TEST_MODE?.trim() === "1";
}
