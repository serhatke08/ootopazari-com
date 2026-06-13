import type { Metadata } from "next";
import Link from "next/link";
import { FEATURE_BOOST_PACKS, formatTryPrice } from "@/lib/listing-feature-boost";

export const metadata: Metadata = {
  title: "İlan Öne Çıkarma",
  description:
    "Oto Pazarı ilan öne çıkarma paketleri, fiyatları ve ödeme koşulları.",
  alternates: {
    canonical: "/ilan-one-cikar",
  },
};

const steps = [
  "Hesabınızla giriş yapın ve Profil > İlanlarım bölümünden onaylı ilanınızı seçin.",
  "İlan öne çıkarma paketlerinden birini seçin.",
  "PayTR güvenli ödeme ekranında kart bilgilerinizi girin.",
  "Ödeme onayından sonra paket ilanınıza otomatik olarak tanımlanır.",
] as const;

export default function IlanOneCikarPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
        <p className="text-sm font-bold uppercase tracking-wide text-amber-600">
          İlan sahipleri için ücretli hizmet
        </p>
        <div className="mt-3 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
              İlanını ana sayfada öne çıkar
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
              Öne çıkarma paketi satın alan onaylı ilanlar, paket süresi içinde
              ana sayfa ve listeleme akışında daha görünür hale gelir. Bu
              hizmet fiziksel ürün gönderimi içermez; satın alma sonrası dijital
              reklam/öne çıkarma hakkı olarak hesabınıza tanımlanır.
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-bold">Ödeme altyapısı</p>
            <p className="mt-1 leading-6">
              Kart bilgileriniz Oto Pazarı tarafından saklanmaz. Web ödemeleri
              PayTR güvenli ödeme sayfası üzerinden alınacak şekilde
              hazırlanmıştır.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {FEATURE_BOOST_PACKS.map((pack) => (
          <article
            key={pack.productId}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-lg font-black text-zinc-950">{pack.label}</p>
            <p className="mt-1 min-h-10 text-sm leading-5 text-zinc-600">
              {pack.subtitle}
            </p>
            <p className="mt-5 text-2xl font-black tabular-nums text-zinc-950">
              {formatTryPrice(pack.fallbackPriceTry)}
            </p>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Fiyatlara KDV dahildir. Paket yalnızca seçilen ilana uygulanır.
            </p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-zinc-950">Nasıl çalışır?</h2>
          <ol className="mt-4 space-y-3">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-6 text-zinc-700">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-black text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-zinc-950">
            İptal, iade ve destek
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-700">
            <p>
              Paket aktif edilmeden önce oluşan hatalı/çift ödemelerde destek
              ekibine başvurabilirsiniz. Hizmet başladıktan sonra dijital reklam
              gösterimi tüketildiği için iade talepleri kullanım durumuna göre
              değerlendirilir.
            </p>
            <p>
              Askıya alınmış, reddedilmiş veya yayından kaldırılmış ilanlar için
              öne çıkarma satın alınamaz. Teknik hata nedeniyle paket
              tanımlanmazsa ödeme kaydı kontrol edilerek paket tanımlanır veya
              iade süreci başlatılır.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/profil/ilanlarim"
              className="rounded-lg bg-[#ffc400] px-4 py-2 text-sm font-black text-black hover:bg-[#ffd24d]"
            >
              İlanlarımı Gör
            </Link>
            <Link
              href="/iade-iptal-politikasi"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              İade Politikası
            </Link>
            <Link
              href="/iletisim"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Destek
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-6 text-zinc-700 shadow-sm">
        <h2 className="text-xl font-black text-zinc-950">PayTR incelemesi için</h2>
        <p className="mt-3">
          Bu sayfa satılan dijital hizmeti, fiyatları, hizmetin nasıl teslim
          edildiğini, ödeme altyapısını ve iade/iptal koşullarını açıklar.
          Kurumsal bilgiler ve sözleşmeler için{" "}
          <Link href="/iletisim" className="font-semibold underline">
            iletişim
          </Link>
          ,{" "}
          <Link href="/gizlilik-politikasi" className="font-semibold underline">
            gizlilik politikası
          </Link>
          ,{" "}
          <Link href="/kullanim-kosullari" className="font-semibold underline">
            kullanım koşulları
          </Link>{" "}
          ve{" "}
          <Link href="/mesafeli-satis-sozlesmesi" className="font-semibold underline">
            mesafeli satış sözleşmesi
          </Link>{" "}
          sayfaları yayındadır.
        </p>
      </section>
    </div>
  );
}
