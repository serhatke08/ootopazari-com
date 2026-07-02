import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MissingEnv } from "@/components/MissingEnv";
import { tryGetSupabaseEnv } from "@/lib/env";
import {
  fetchParcaciDealerCoverById,
  fetchPublicParcaciListingById,
} from "@/lib/parcaci-listings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Parca Ilani ${id}`,
    description: "Parca ilan detayi, fiyat ve urun durumu bilgileri.",
  };
}

export default async function ParcaDetailPage({ params }: Props) {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const item = await fetchPublicParcaciListingById(supabase, id);
  if (!item) notFound();

  const dealerCover = await fetchParcaciDealerCoverById(supabase, env.url, item.dealerId);
  const conditionLabel =
    item.condition === "sifir"
      ? "Sifir"
      : item.condition === "ikinci_el"
        ? "Ikinci El"
        : "Belirsiz";

  return (
    <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6">
      <Link
        href="/parca"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-zinc-700 hover:text-zinc-900"
      >
        <span aria-hidden>&larr;</span> Parca Pazari
      </Link>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-4">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 70vw"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-400">
                Gorsel bulunamadi
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h1 className="text-2xl font-extrabold text-zinc-900">{item.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-white">
                Durum: {conditionLabel}
              </span>
              {item.cityName ? (
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                  Sehir: {item.cityName}
                </span>
              ) : null}
              {item.createdAt ? (
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                  Tarih: {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                </span>
              ) : null}
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-zinc-700">
              {item.description || "Bu ilanda aciklama girilmemis."}
            </p>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Fiyat
            </p>
            <p className="mt-1 text-3xl font-extrabold text-zinc-900">
              {item.price != null ? `₺${item.price.toLocaleString("tr-TR")}` : "Sorunuz"}
            </p>
            <Link
              href="/mesajlar"
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[#ffcc00] px-4 py-2.5 text-sm font-extrabold text-black hover:bg-[#ffd84d]"
            >
              Saticiya Mesaj Gonder
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <div className="relative aspect-[16/8] w-full bg-zinc-100">
              {dealerCover ? (
                <Image
                  src={dealerCover}
                  alt={item.dealerName ?? "Parcaci"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 22rem"
                />
              ) : null}
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Magaza
              </p>
              <p className="mt-1 text-base font-bold text-zinc-900">
                {item.dealerName ?? "Parcaci Bayisi"}
              </p>
              <Link
                href="/bayi/parcaci"
                className="mt-3 inline-flex text-sm font-semibold text-zinc-700 underline"
              >
                Tum Parcacilari Gor
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
