import type { Metadata } from "next";
import { LegalPageLinks } from "@/components/LegalPageLinks";
import { getMerchantLegalInfo } from "@/lib/merchant-legal";

export const metadata: Metadata = {
  title: "İade ve İptal Politikası",
  description: "Oto Pazarı ücretli dijital hizmetler için iade ve iptal koşulları.",
  alternates: { canonical: "/iade-iptal-politikasi" },
};

export default function IadeIptalPolitikasiPage() {
  const m = getMerchantLegalInfo();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <article className="rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-7 text-zinc-700 shadow-sm sm:p-8">
        <h1 className="text-3xl font-black tracking-tight text-zinc-950">
          İade ve İptal Politikası
        </h1>
        <p className="mt-4">
          Oto Pazarı ücretli hizmetleri dijital ilan öne çıkarma ve bayi
          üyelik abonelikleridir. <strong>Fiziksel ürün gönderimi yapılmaz.</strong>
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Dijital hizmet ve cayma hakkı
        </h2>
        <p className="mt-2">
          Mesafeli sözleşmelerde dijital hizmetin ifasına başlanması halinde
          cayma hakkı, yürürlükteki mevzuat ve hizmetin niteliği çerçevesinde
          sınırlı olabilir. Ödeme onayı ile birlikte seçilen paket ilgili
          ilana veya hesaba tanımlanmaya başlanır.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Hizmet tanımlanmadıysa
        </h2>
        <p className="mt-2">
          Ödeme alınmasına rağmen hizmet teknik nedenle tanımlanmadıysa{" "}
          <a href={`mailto:${m.email}`} className="underline">
            {m.email}
          </a>{" "}
          adresine ödeme tarihi, tutar ve işlem referansı ile başvurun. Paket
          tanımlanır veya iade süreci başlatılır.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Hizmet başladıktan sonra
        </h2>
        <p className="mt-2">
          Öne çıkarma süresi başladıktan sonra yapılan iade talepleri; kullanım
          süresi, ilan durumu (yayında / askıda / silinmiş) ve teknik hata
          olup olmadığı dikkate alınarak değerlendirilir.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Çift ödeme ve hatalı işlem
        </h2>
        <p className="mt-2">
          Aynı paket için mükerrer ödeme veya sistem hatası tespit edilirse
          fazla tahsilat iade edilir. Başvuruda PayTR işlem referansı veya
          sipariş numarasını belirtin.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">İade yöntemi</h2>
        <p className="mt-2">
          Onaylanan iadeler, mümkün olan hallerde ödemenin yapıldığı karta /
          hesaba, PayTR ve banka süreçleri çerçevesinde iade edilir.
        </p>

        <h2 className="mt-6 text-xl font-black text-zinc-950">İletişim</h2>
        <p className="mt-2">
          İade ve iptal talepleri:{" "}
          <a href={`mailto:${m.email}`} className="underline">
            {m.email}
          </a>
          {m.phone ? (
            <>
              {" "}
              · Tel:{" "}
              <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="underline">
                {m.phone}
              </a>
            </>
          ) : null}
        </p>

        <div className="mt-8 border-t border-zinc-200 pt-6">
          <LegalPageLinks />
        </div>
      </article>
    </div>
  );
}
