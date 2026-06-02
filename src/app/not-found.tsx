import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sayfa Bulunamadı (404)",
  description: "Aradığınız sayfa bulunamadı.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
      <div className="text-center">
        <h1 className="text-6xl font-extrabold text-zinc-900 sm:text-8xl">
          404
        </h1>
        <h2 className="mt-4 text-2xl font-bold text-zinc-800 sm:text-3xl">
          Sayfa Bulunamadı
        </h2>
        <p className="mt-4 text-zinc-600">
          Aradığınız sayfa kaldırılmış, taşınmış veya hiç var olmamış olabilir.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="rounded-lg bg-[#ffc400] px-6 py-3 font-bold text-black transition hover:bg-[#ffd24d]"
          >
            Ana Sayfaya Dön
          </Link>
          <Link
            href="/ilan-ver"
            className="rounded-lg border border-zinc-300 bg-white px-6 py-3 font-semibold text-zinc-900 transition hover:bg-zinc-50"
          >
            İlan Ver
          </Link>
        </div>
      </div>
    </div>
  );
}
