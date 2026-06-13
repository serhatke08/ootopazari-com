import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İade ve İptal Politikası",
  description: "Oto Pazarı ücretli dijital hizmetler için iade ve iptal koşulları.",
  alternates: {
    canonical: "/iade-iptal-politikasi",
  },
};

export default function IadeIptalPolitikasiPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <article className="rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-7 text-zinc-700 shadow-sm sm:p-8">
        <h1 className="text-3xl font-black tracking-tight text-zinc-950">
          İade ve İptal Politikası
        </h1>
        <p className="mt-4">
          Oto Pazarı ücretli hizmetleri dijital ilan yayınlama ve ilan öne
          çıkarma hizmetleridir. Fiziksel ürün gönderimi yapılmaz.
        </p>
        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Hizmet başlamadan önce
        </h2>
        <p className="mt-2">
          Ödeme alınmasına rağmen hizmet teknik nedenle tanımlanmadıysa kullanıcı
          destek talebi oluşturabilir. Kontrol sonrası paket tanımlanır veya
          iade süreci başlatılır.
        </p>
        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Hizmet başladıktan sonra
        </h2>
        <p className="mt-2">
          İlan öne çıkarma hizmeti ödeme onayından sonra dijital reklam hakkı
          olarak başlar. Hizmet başladıktan sonra iade talepleri kullanım
          durumu, teknik hata ve ilan durumuna göre değerlendirilir.
        </p>
        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Çift ödeme ve hatalı işlem
        </h2>
        <p className="mt-2">
          Aynı işlem için çift ödeme alınması veya ödeme referansında hata
          oluşması halinde destek@otopazari.com adresine ödeme tarihi, tutar ve
          işlem referansı ile başvurabilirsiniz.
        </p>
      </article>
    </div>
  );
}
