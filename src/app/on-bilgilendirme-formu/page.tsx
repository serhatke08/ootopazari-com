import type { Metadata } from "next";
import { LegalPageLinks } from "@/components/LegalPageLinks";
import { MerchantLegalBlock } from "@/components/MerchantLegalBlock";
import { getMerchantLegalInfo } from "@/lib/merchant-legal";

export const metadata: Metadata = {
  title: "Ön Bilgilendirme Formu",
  description:
    "Oto Pazarı ücretli dijital hizmetler için ön bilgilendirme formu.",
  alternates: { canonical: "/on-bilgilendirme-formu" },
};

export default function OnBilgilendirmeFormuPage() {
  const m = getMerchantLegalInfo();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <article className="rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-7 text-zinc-700 shadow-sm sm:p-8">
        <h1 className="text-3xl font-black tracking-tight text-zinc-950">
          Ön Bilgilendirme Formu
        </h1>
        <p className="mt-4">
          6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli
          Sözleşmeler Yönetmeliği kapsamında, ücretli dijital hizmet satın
          alımından önce aşağıdaki bilgiler sunulmaktadır.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">Satıcı</h2>
        <div className="mt-3">
          <MerchantLegalBlock info={m} />
        </div>

        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Hizmetin temel özellikleri
        </h2>
        <p className="mt-2">
          İlan öne çıkarma paketleri ve bayi üyelik hizmetleri dijital
          platform hizmetidir; seçilen süre boyunca ilanın görünürlüğünü
          artırır veya bayi paneli erişimi sağlar.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Toplam fiyat ve ödeme
        </h2>
        <p className="mt-2">
          Fiyatlar paket seçim ekranında Türk Lirası (KDV dahil) olarak
          gösterilir. Ödeme banka/kredi kartı ile PayTR güvenli ödeme altyapısı
          üzerinden alınır. Kart bilgileri Oto Pazarı tarafından saklanmaz.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Teslimat ve ifa
        </h2>
        <p className="mt-2">
          Fiziksel ürün gönderilmez. Ödeme onayından sonra hizmet dijital
          olarak hesabınıza tanımlanır. Ayrıntılar için{" "}
          <a href="/teslimat-kosullari" className="underline">
            Teslimat Koşulları
          </a>
          .
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Cayma hakkı ve iade
        </h2>
        <p className="mt-2">
          Dijital hizmetin ifasına (öne çıkarma süresinin başlamasına) ödeme
          onayı ile birlikte başlanır. Cayma hakkı ve iade koşulları{" "}
          <a href="/iade-iptal-politikasi" className="underline">
            İade ve İptal Politikası
          </a>{" "}
          ile{" "}
          <a href="/mesafeli-satis-sozlesmesi" className="underline">
            Mesafeli Satış Sözleşmesi
          </a>
          &apos;nde açıklanmıştır.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">Şikâyet</h2>
        <p className="mt-2">
          Talepleriniz için{" "}
          <a href={`mailto:${m.email}`} className="underline">
            {m.email}
          </a>
          {m.phone ? (
            <>
              {" "}
              veya{" "}
              <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="underline">
                {m.phone}
              </a>
            </>
          ) : null}{" "}
          üzerinden iletişime geçebilirsiniz.
        </p>

        <div className="mt-8 border-t border-zinc-200 pt-6">
          <LegalPageLinks />
        </div>
      </article>
    </div>
  );
}
