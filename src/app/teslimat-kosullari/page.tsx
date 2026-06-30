import type { Metadata } from "next";
import { LegalPageLinks } from "@/components/LegalPageLinks";
import { MerchantLegalBlock } from "@/components/MerchantLegalBlock";
import { getMerchantLegalInfo } from "@/lib/merchant-legal";

export const metadata: Metadata = {
  title: "Teslimat Koşulları",
  description:
    "Oto Pazarı dijital hizmetler için teslimat ve ifa koşulları. Fiziksel kargo yapılmaz.",
  alternates: { canonical: "/teslimat-kosullari" },
};

export default function TeslimatKosullariPage() {
  const merchant = getMerchantLegalInfo();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <article className="rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-7 text-zinc-700 shadow-sm sm:p-8">
        <h1 className="text-3xl font-black tracking-tight text-zinc-950">
          Teslimat Koşulları
        </h1>
        <p className="mt-4">
          Oto Pazarı üzerinden satın alınan ücretli hizmetler{" "}
          <strong>dijital hizmet</strong>tir. Fiziksel ürün gönderimi veya kargo
          işlemi yapılmaz.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Hizmet türleri
        </h2>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>İlan öne çıkarma paketleri (ana sayfa görünürlüğü)</li>
          <li>Bayi / galeri üyelik abonelikleri</li>
        </ul>

        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Teslimat / ifa süresi
        </h2>
        <p className="mt-2">
          Ödeme PayTR üzerinden başarıyla onaylandıktan sonra hizmet, en geç{" "}
          <strong>24 saat içinde</strong> ilgili kullanıcı hesabına ve seçilen
          ilana dijital olarak tanımlanır. Çoğu işlemde bu süre birkaç dakikadır.
        </p>
        <p className="mt-2">
          Teknik aksaklık nedeniyle hizmet tanımlanamazsa{" "}
          <a href={`mailto:${merchant.email}`} className="underline">
            {merchant.email}
          </a>{" "}
          üzerinden destek talebi oluşturabilirsiniz; paket tanımlanır veya iade
          süreci başlatılır.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Teslimat yeri
        </h2>
        <p className="mt-2">
          Hizmet, satın alan kullanıcının Oto Pazarı hesabı ve (öne çıkarma
          için) seçilen ilan kaydı üzerinde elektronik ortamda ifa edilir.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Kargo ve nakliye
        </h2>
        <p className="mt-2">
          Fiziksel teslimat olmadığı için kargo ücreti, teslimat adresi veya
          kargo firması bilgisi bulunmamaktadır.
        </p>

        <div className="mt-8">
          <MerchantLegalBlock info={merchant} />
        </div>

        <div className="mt-8 border-t border-zinc-200 pt-6">
          <LegalPageLinks />
        </div>
      </article>
    </div>
  );
}
