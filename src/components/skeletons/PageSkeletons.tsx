import { BrandPagePlaceholder } from "@/components/BrandPagePlaceholder";

/** Eski gri skeleton’lar kaldırıldı — her yerde marka animasyonu. */
export function GenericPageSkeleton() {
  return <BrandPagePlaceholder />;
}

export function ProfilPageSkeleton() {
  return <BrandPagePlaceholder compact />;
}

export function MessagesPageSkeleton() {
  return <BrandPagePlaceholder />;
}

export function ListPageSkeleton(_props?: { titleWidth?: string }) {
  return <BrandPagePlaceholder />;
}

export function HomeBrowseSkeleton() {
  return <BrandPagePlaceholder />;
}

export function skeletonForPath(_pathname: string) {
  return <BrandPagePlaceholder />;
}
