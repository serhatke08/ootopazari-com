import type { Metadata } from "next";
import Link from "next/link";
import { MissingEnv } from "@/components/MissingEnv";
import { ParcaciPartCard } from "@/components/ParcaciPartCard";
import { tryGetSupabaseEnv } from "@/lib/env";
import { fetchPublicParcaciListings } from "@/lib/parcaci-listings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Parça Pazarı",
  description:
    "Parça Pazarı'nda sıfır ve ikinci el oto yedek parça ilanlarını keşfedin.",
};

export default async function ParcaHomePage() {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const items = await fetchPublicParcaciListings(supabase, 30);

  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-6 text-white sm:p-8">
        <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          Site ICI PARCA PAZARI
        </p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-4xl">
          Oto Parca Ana Sayfasi
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-200 sm:text-base">
          Sifir ve ikinci el parcalari tek yerde incele. Urun kartindan direkt detay
          sayfasina gecip fiyat, durum ve satici bilgilerini gorebilirsin.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/bayi/parcaci"
            className="rounded-lg bg-[#ffcc00] px-4 py-2 text-sm font-extrabold text-black hover:bg-[#ffd84d]"
          >
            Parcaci Bayileri
          </Link>
          <Link
            href="/bayi/panel/parcaci"
            className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Parcaci Paneli
          </Link>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">Parca Ilanlari</h2>
          <span className="text-xs font-semibold text-zinc-500">{items.length} ilan</span>
        </div>
        {items.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600">
            Henuz yayinda parca ilani yok.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <ParcaciPartCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
