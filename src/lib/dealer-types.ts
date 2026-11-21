import { dealerTypeLogoSrc } from "@/lib/dealer-logos";

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
    iconSrc: dealerTypeLogoSrc("galeri") ?? "",
  },
  expertiz: {
    label: "Expertiz",
    iconSrc: dealerTypeLogoSrc("expertiz") ?? "",
  },
  kiralama: {
    label: "Kiralama",
    iconSrc: dealerTypeLogoSrc("kiralama") ?? "",
  },
  parcaci: {
    label: "Yedek Parça",
    iconSrc: dealerTypeLogoSrc("parcaci") ?? "",
  },
};
