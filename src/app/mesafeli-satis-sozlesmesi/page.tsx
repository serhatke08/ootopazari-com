import type { Metadata } from "next";
import { LegalPageLinks } from "@/components/LegalPageLinks";
import { MerchantLegalBlock } from "@/components/MerchantLegalBlock";
import { getMerchantLegalInfo } from "@/lib/merchant-legal";

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi",
  description: "Oto Pazarı dijital hizmetler için mesafeli satış sözleşmesi.",
  alternates: { canonical: "/mesafeli-satis-sozlesmesi" },
};

export default function MesafeliSatisSozlesmesiPage() {
  const m = getMerchantLegalInfo();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <article className="rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-7 text-zinc-700 shadow-sm sm:p-8">
        <h1 className="text-3xl font-black tracking-tight text-zinc-950">
          Mesafeli Satış Sözleşmesi
        </h1>
        <p className="mt-4">
          İşbu sözleşme, aşağıda bilgileri yer alan satıcı ile Oto Pazarı
          üzerinden ücretli dijital hizmet satın alan alıcı arasında, 6502
          sayılı Kanun ve ilgili yönetmelik hükümleri uyarınca elektronik
          ortamda kurulmuştur.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">1. Satıcı</h2>
        <div className="mt-3">
          <MerchantLegalBlock info={m} />
        </div>

        <h2 className="mt-6 text-xl font-black text-zinc-950">2. Alıcı</h2>
        <p className="mt-2">
          Oto Pazarı&apos;na kayıtlı ve ödeme yapan gerçek veya tüzel kişi
          kullanıcı.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">
          3. Sözleşme konusu
        </h2>
        <p className="mt-2">
          Alıcının seçtiği ilan öne çıkarma paketi ve/veya bayi üyelik
          hizmetinin dijital ortamda sunulmasıdır. Fiziksel mal satışı veya
          kargo yapılmaz.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">
          4. Hizmetin niteliği ve süresi
        </h2>
        <p className="mt-2">
          Paket süresi ve kapsamı satın alma ekranında belirtilir. Öne çıkarma
          hizmeti, seçilen gün sayısı boyunca ilanın platform içi görünürlüğünü
          artırır.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">
          5. Fiyat ve ödeme
        </h2>
        <p className="mt-2">
          Tüm fiyatlar Türk Lirası ve KDV dahil olarak gösterilir. Ödeme PayTR
          güvenli ödeme altyapısı ile tahsil edilir. Kart bilgileri satıcı
          sistemlerinde saklanmaz.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">
          6. Teslimat ve ifa
        </h2>
        <p className="mt-2">
          Ödeme onayından sonra hizmet dijital olarak tanımlanır. Ayrıntılı
          teslimat koşulları için{" "}
          <a href="/teslimat-kosullari" className="underline">
            Teslimat Koşulları
          </a>{" "}
          sayfasına bakınız.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">
          7. Cayma hakkı ve iade
        </h2>
        <p className="mt-2">
          Dijital içerik ve anında ifa edilen hizmetlerde, ödeme onayı ile
          birlikte ifa başlar. Cayma, iptal ve iade koşulları{" "}
          <a href="/iade-iptal-politikasi" className="underline">
            İade ve İptal Politikası
          </a>
          &apos;nda düzenlenmiştir.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">
          8. Uyuşmazlık
        </h2>
        <p className="mt-2">
          Şikâyet ve itirazlar için{" "}
          <a href={`mailto:${m.email}`} className="underline">
            {m.email}
          </a>{" "}
          ile iletişime geçilebilir. Tüketici işlemlerinde yasal başvuru
          yolları saklıdır.
        </p>

        <div className="mt-8 border-t border-zinc-200 pt-6">
          <LegalPageLinks />
        </div>
      </article>
    </div>
  );
}
