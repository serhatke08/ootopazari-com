import Link from "next/link";
import type { Metadata } from "next";
import { SEO_GUIDE_PAGES } from "@/lib/seo-guides";

export const metadata: Metadata = {
  title: "Rehber — Oto Pazarı ipuçları ve araç ilan rehberleri",
  description:
    "İkinci el araba alım-satım, ücretsiz ilan verme ve sıfır otomobil ilanları hakkında Oto Pazarı rehber yazıları.",
  alternates: { canonical: "/rehber" },
  openGraph: {
    title: "Rehber — Oto Pazarı",
    description:
      "Araç ilanları, ikinci el alım-satım ve platform kullanımı hakkında rehber içerikler.",
    url: "/rehber",
    type: "website",
  },
};

export default function RehberIndexPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
        Oto Pazarı Rehber
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
        İkinci el araba, sıfır otomobil ilanları ve ücretsiz ilan verme
        konularında pratik rehberler.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SEO_GUIDE_PAGES.map((guide) => (
          <li key={guide.slug}>
            <Link
              href={`/rehber/${guide.slug}`}
              className="block h-full rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
            >
              <h2 className="text-base font-bold text-zinc-900 sm:text-lg">
                {guide.title}
              </h2>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-600">
                {guide.description}
              </p>
              <span className="mt-3 inline-block text-sm font-semibold text-zinc-800 underline decoration-zinc-400">
                Devamını oku
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
