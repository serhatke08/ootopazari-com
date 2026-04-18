export const DEALER_TYPE_VALUES = [
  "galeri",
  "expertiz",
  "kiralama",
  "parcaci",
] as const;

export type DealerType = (typeof DEALER_TYPE_VALUES)[number];

export const DEALER_TYPE_META: Record<
  DealerType,
  { label: string; iconSrc: string }
> = {
  galeri: {
    label: "Galeri",
    iconSrc:
      "/menu/kategori%20icon/From%20Concept%20to%20Clicks/galeridogrulama.png",
  },
  expertiz: {
    label: "Expertiz",
    iconSrc:
      "/menu/kategori%20icon/From%20Concept%20to%20Clicks/expertizdogrulama.png",
  },
  kiralama: {
    label: "Kiralama",
    iconSrc:
      "/menu/kategori%20icon/From%20Concept%20to%20Clicks/kiralamadogrulama.png",
  },
  parcaci: {
    label: "Parçacı",
    iconSrc:
      "/menu/kategori%20icon/From%20Concept%20to%20Clicks/parcac%C4%B1dogrulama.png",
  },
};
