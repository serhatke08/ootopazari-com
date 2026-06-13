import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kullanım Koşulları",
  description: "Oto Pazarı kullanım koşulları.",
  alternates: {
    canonical: "/kullanim-kosullari",
  },
};

export default function KullanimKosullariPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <article className="rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-7 text-zinc-700 shadow-sm sm:p-8">
        <h1 className="text-3xl font-black tracking-tight text-zinc-950">
          Kullanım Koşulları
        </h1>
        <p className="mt-4">
          Oto Pazarı, araç ilanı yayınlama, ilan arama, favorilere ekleme,
          mesajlaşma ve dijital ilan öne çıkarma hizmetleri sunar. Platformu
          kullanan herkes bu koşulları kabul etmiş sayılır.
        </p>
        <h2 className="mt-6 text-xl font-black text-zinc-950">
          İlan sorumluluğu
        </h2>
        <p className="mt-2">
          İlan içerikleri kullanıcı tarafından sağlanır. Yanıltıcı, hukuka
          aykırı, üçüncü kişilerin haklarını ihlal eden veya güvenlik riski
          oluşturan ilanlar yayından kaldırılabilir.
        </p>
        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Ücretli hizmetler
        </h2>
        <p className="mt-2">
          İlan öne çıkarma ve benzeri dijital hizmetlerde fiyat, süre ve kapsam
          ilgili ürün sayfasında belirtilir. Ödeme onayı sonrası hizmet seçilen
          ilana tanımlanır.
        </p>
        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Yasaklı kullanım
        </h2>
        <p className="mt-2">
          Sahte ilan, spam, dolandırıcılık, başkasına ait görsel veya bilgi
          kullanımı, sistemleri kötüye kullanma ve yetkisiz erişim girişimleri
          yasaktır.
        </p>
      </article>
    </div>
  );
}
