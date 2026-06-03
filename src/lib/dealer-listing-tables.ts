/**
 * Dealer type'a göre listing table mapping
 */

import type { DealerType } from "./bayi-types";

export const DEALER_LISTING_TABLES: Record<DealerType, string> = {
  kiralama: "kiralik_listings",
  galeri: "galeri_listings",
  expertiz: "expertiz_listings",
  parcaci: "parcaci_listings",
};

export const DEALER_PROFILE_TABLES: Record<DealerType, string> = {
  kiralama: "kiralama_dealers",
  galeri: "galeri_dealers",
  expertiz: "expertiz_dealers",
  parcaci: "parcaci_dealers",
};

/**
 * Dealer type için listing table ismini döner
 */
export function getDealerListingTable(dealerType: DealerType): string {
  return DEALER_LISTING_TABLES[dealerType];
}

/**
 * Dealer type için profile table ismini döner
 */
export function getDealerProfileTable(dealerType: DealerType): string {
  return DEALER_PROFILE_TABLES[dealerType];
}

/**
 * Listing table'ın fallback olarak `listings` tablosuna düşüp düşmeyeceğini kontrol eder
 */
export function shouldFallbackToListings(dealerType: DealerType): boolean {
  // Şu an için tüm dealer tiplerinin kendi tablosu var
  // Ancak gelecekte bazı tipler için fallback gerekebilir
  return false;
}

/**
 * Dealer type'a göre public görünüm sekme yapısı
 */
export function getDealerPublicTabs(
  dealerType: DealerType
): { key: string; label: string }[] {
  if (dealerType === "kiralama") {
    return [
      { key: "vehicles", label: "Araçlar" },
      { key: "dealers", label: "Bayiler" },
    ];
  }

  // galeri, parcaci, expertiz
  return [
    { key: "dealers", label: "Bayiler" },
    { key: "listings", label: "İlanlar" },
  ];
}

/**
 * Dealer type için default açılış sekmesi
 */
export function getDealerDefaultTab(dealerType: DealerType): string {
  if (dealerType === "parcaci" || dealerType === "galeri") {
    return "listings";
  }
  return "dealers";
}

/**
 * Owner panel için ürün ekleme butonu metni
 */
export function getAddProductButtonText(dealerType: DealerType): string {
  switch (dealerType) {
    case "kiralama":
      return "Araç Ekle";
    case "galeri":
      return "İlan Ekle";
    case "parcaci":
      return "Ürün Ekle";
    case "expertiz":
      return "Fiyatlarım";
  }
}
