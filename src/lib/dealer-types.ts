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
    iconSrc: "/menu/galeri.png?v=20261121c",
  },
  expertiz: {
    label: "Expertiz",
    iconSrc: "/menu/expertiz.png?v=20261121c",
  },
  kiralama: {
    label: "Kiralama",
    iconSrc: "/menu/kiralama_oto.png?v=20261121c",
  },
  parcaci: {
    label: "Yedek Parça",
    iconSrc: "/menu/parca.png?v=20261121c",
  },
};
