import Image from "next/image";
import Link from "next/link";
import type { ParcaciListingCardItem } from "@/lib/parcaci-listings";

function conditionLabel(condition: ParcaciListingCardItem["condition"]) {
  if (condition === "sifir") return "Sıfır";
  if (condition === "ikinci_el") return "İkinci El";
  return "Durum Belirsiz";
}

function conditionClass(condition: ParcaciListingCardItem["condition"]) {
  if (condition === "sifir") return "bg-emerald-100 text-emerald-800";
  if (condition === "ikinci_el") return "bg-amber-100 text-amber-900";
  return "bg-zinc-100 text-zinc-700";
}

export function ParcaciPartCard({ item }: { item: ParcaciListingCardItem }) {
  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/parca/${item.id}`} className="block">
        <div className="relative aspect-[4/3] w-full bg-zinc-100">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 20vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400">
              <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9.75 17L15 12l-5.25-5M4 12h11"
                />
              </svg>
            </div>
          )}
        </div>
        <div className="space-y-2 p-3">
          <h2 className="line-clamp-2 min-h-[2.75rem] text-sm font-bold text-zinc-900">
            {item.title}
          </h2>
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-extrabold text-zinc-900">
              {item.price != null ? `₺${item.price.toLocaleString("tr-TR")}` : "Fiyat sorunuz"}
            </p>
            <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${conditionClass(item.condition)}`}>
              {conditionLabel(item.condition)}
            </span>
          </div>
          <p className="line-clamp-1 text-xs text-zinc-600">
            {item.dealerName ?? "Parçacı"}{item.cityName ? ` · ${item.cityName}` : ""}
          </p>
        </div>
      </Link>
    </article>
  );
}
