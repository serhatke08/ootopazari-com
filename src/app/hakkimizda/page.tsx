import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLinks } from "@/components/LegalPageLinks";
import { MerchantLegalBlock } from "@/components/MerchantLegalBlock";
import { getMerchantLegalInfo } from "@/lib/merchant-legal";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: "Oto Pazarı hakkında ve satıcı bilgileri.",
  alternates: { canonical: "/hakkimizda" },
};

export default function HakkimizdaPage() {
  const merchant = getMerchantLegalInfo();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-7 text-zinc-700 shadow-sm sm:p-8">
        <h1 className="text-3xl font-black tracking-tight text-zinc-950">
          Hakkımızda
        </h1>
        <p className="mt-4">
          Oto Pazarı, Türkiye genelinde bireysel kullanıcıların ve işletmelerin
          araç ilanlarını yayınlayabildiği, alıcıların ilanları filtreleyip
          satıcılarla iletişime geçebildiği bir araç ilan platformudur.
        </p>
        <p className="mt-4">
          Platformda otomobil, motosiklet, ticari araç, galeri, ekspertiz,
          kiralama ve parça kategorilerine yönelik ilan ve başvuru akışları
          bulunur. Ücretli dijital hizmetler; ilan görünürlüğünü artıran öne
          çıkarma paketleri ve bayi üyelik aboneliklerinden oluşur. Fiziksel
          ürün satışı veya kargo hizmeti sunulmaz.
        </p>

        <div className="mt-8">
          <MerchantLegalBlock info={merchant} />
        </div>

        <p className="mt-6">
          <Link href="/iletisim" className="font-semibold text-zinc-900 underline">
            İletişim sayfası
          </Link>
        </p>

        <div className="mt-8 border-t border-zinc-200 pt-6">
          <LegalPageLinks />
        </div>
      </section>
    </div>
  );
}
