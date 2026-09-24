import type { CategoryRow } from "@/lib/listings-data";
import { slugifyListingTitle } from "@/lib/listing-seo";

/** Kategori SEO yolu: `/kategori/otomobil` */
export function categorySeoSlug(category: Pick<CategoryRow, "name" | "code">): string {
  const fromCode = slugifyListingTitle(category.code);
  if (fromCode && fromCode !== "ilan") return fromCode;
  return slugifyListingTitle(category.name) || "kategori";
}

export function buildCategorySeoPath(
  category: Pick<CategoryRow, "name" | "code">
): string {
  return `/kategori/${encodeURIComponent(categorySeoSlug(category))}`;
}

export function findCategoryBySeoSlug(
  categories: CategoryRow[],
  slug: string
): CategoryRow | null {
  const want = slugifyListingTitle(slug);
  if (!want) return null;
  for (const c of categories) {
    if (categorySeoSlug(c) === want) return c;
  }
  return null;
}

export function categorySeoTitle(categoryName: string): string {
  const name = categoryName.trim() || "İlanlar";
  return `${name} İlanları`;
}

export function categorySeoDescription(categoryName: string): string {
  const name = categoryName.trim() || "araç";
  return `Oto Pazarı'nda ${name.toLocaleLowerCase("tr")} ilanları. İkinci el ve sıfır ${name.toLocaleLowerCase("tr")} ilanlarını inceleyin, filtreleyin, satıcıyla mesajlaşın.`;
}
