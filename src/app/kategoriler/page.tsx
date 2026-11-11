import type { Metadata } from "next";
import Link from "next/link";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import { fetchCategories } from "@/lib/listings-data";
import { sortByCreateListingCategoryOrder } from "@/lib/vehicle-category-sort";
import { categoryIconSrc } from "@/lib/brand-category-icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kategoriler",
  description: "Oto Pazarı araç kategorileri",
};

const HIDDEN_CODES = new Set([
  "all",
  "big_cattle",
  "small_cattle",
  "chicken",
  "dog",
  "cat",
  "bird",
]);

export default async function KategorilerPage() {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <MissingEnv />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const categories = sortByCreateListingCategoryOrder(
    (await fetchCategories(supabase)).filter(
      (item) => item.code && !HIDDEN_CODES.has(item.code)
    ),
    (item) => item.code ?? ""
  );

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
      <h1 className="mb-4 text-2xl font-black tracking-tight text-zinc-900">
        Kategoriler
      </h1>
      <div className="space-y-2">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/?category_id=${encodeURIComponent(category.id)}`}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3.5 shadow-sm transition hover:border-zinc-300"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={categoryIconSrc(category.code)}
              alt=""
              className="h-10 w-10 object-contain"
            />
            <span className="flex-1 text-[15px] font-semibold text-zinc-900">
              {category.name ?? "Kategori"}
            </span>
            <span className="text-xl text-zinc-400">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
