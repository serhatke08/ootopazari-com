import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi",
  description: "Oto Pazarı dijital hizmetler için mesafeli satış sözleşmesi.",
  alternates: {
    canonical: "/mesafeli-satis-sozlesmesi",
  },
};

export default function MesafeliSatisSozlesmesiPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <article className="rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-7 text-zinc-700 shadow-sm sm:p-8">
        <h1 className="text-3xl font-black tracking-tight text-zinc-950">
          Mesafeli Satış Sözleşmesi
        </h1>
        <p className="mt-4">
          Bu sözleşme, Oto Pazarı üzerinden sunulan dijital ilan öne çıkarma ve
          benzeri ücretli dijital hizmetlerin satış koşullarını düzenler.
        </p>
        <h2 className="mt-6 text-xl font-black text-zinc-950">Hizmet konusu</h2>
        <p className="mt-2">
          Kullanıcı, seçtiği ilan için belirlenen süre ve fiyat karşılığında
          dijital öne çıkarma hizmeti satın alır. Hizmet fiziksel teslimat
          içermez.
        </p>
        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Fiyat ve ödeme
        </h2>
        <p className="mt-2">
          Paket fiyatları ürün sayfasında Türk Lirası olarak gösterilir. Kartlı
          ödemeler PayTR güvenli ödeme altyapısı ile işlenir. Kart bilgileri
          Oto Pazarı sistemlerinde saklanmaz.
        </p>
        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Teslim ve ifa
        </h2>
        <p className="mt-2">
          Ödeme onayından sonra dijital hizmet seçilen ilana tanımlanır. Teknik
          aksaklık halinde kullanıcı destek birimiyle iletişime geçebilir.
        </p>
        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Cayma ve iade
        </h2>
        <p className="mt-2">
          Dijital hizmetin ifasına başlanmışsa iade talepleri iade ve iptal
          politikası kapsamında teknik hata, çift ödeme ve kullanım durumu
          dikkate alınarak değerlendirilir.
        </p>
      </article>
    </div>
  );
}
