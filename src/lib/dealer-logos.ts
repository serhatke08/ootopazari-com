/** Uygulamadaki bayi PNG’leri — `otopazar/images` ile birebir. */
export const DEALER_LOGO_VER = "20261121";

const TYPE_LOGOS: Record<string, string> = {
  galeri: `/menu/galeri.png?v=${DEALER_LOGO_VER}`,
  expertiz: `/menu/expertiz.png?v=${DEALER_LOGO_VER}`,
  kiralama: `/menu/kiralama_oto.png?v=${DEALER_LOGO_VER}`,
  parcaci: `/menu/parca.png?v=${DEALER_LOGO_VER}`,
};

const BADGES: Record<string, string> = {
  galeri: `/menu/galeridogrulama.png?v=${DEALER_LOGO_VER}`,
  expertiz: `/menu/expertizdogrulama.png?v=${DEALER_LOGO_VER}`,
  kiralama: `/menu/kiralamadogrulama.png?v=${DEALER_LOGO_VER}`,
  parcaci: `/menu/parcacidogrulama.png?v=${DEALER_LOGO_VER}`,
};

export function dealerTypeLogoSrc(type: string): string | undefined {
  return TYPE_LOGOS[type];
}

export function dealerBadgeSrc(type: string): string | undefined {
  return BADGES[type];
}
