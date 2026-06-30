import type { Metadata } from "next";
import { LegalPageLinks } from "@/components/LegalPageLinks";
import { MerchantLegalBlock } from "@/components/MerchantLegalBlock";
import { getMerchantLegalInfo } from "@/lib/merchant-legal";

export const metadata: Metadata = {
  title: "İletişim",
  description: "Oto Pazarı iletişim, satıcı ve destek bilgileri.",
  alternates: { canonical: "/iletisim" },
};

export default function IletisimPage() {
  const merchant = getMerchantLegalInfo();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
        <h1 className="text-3xl font-black tracking-tight text-zinc-950">
          İletişim
        </h1>
        <p className="mt-4 text-sm leading-6 text-zinc-600">
          İlan, üyelik, bayi başvurusu, ödeme ve iade talepleri için aşağıdaki
          kanallardan bize ulaşabilirsiniz.
        </p>

        <div className="mt-6">
          <MerchantLegalBlock info={merchant} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-bold text-zinc-950">E-posta destek</p>
            <a
              href={`mailto:${merchant.email}`}
              className="mt-1 block text-sm text-zinc-700 underline"
            >
              {merchant.email}
            </a>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              Ödeme, iade, teknik sorun ve hesap işlemleri.
            </p>
          </div>
          {merchant.phone ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-bold text-zinc-950">Telefon</p>
              <a
                href={`tel:${merchant.phone.replace(/\s/g, "")}`}
                className="mt-1 block text-sm text-zinc-700 underline"
              >
                {merchant.phone}
              </a>
            </div>
          ) : null}
        </div>

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          Kart bilgileriniz Oto Pazarı tarafından alınmaz veya saklanmaz. Web
          ödemeleri PayTR güvenli ödeme altyapısı üzerinden işlenir.
        </div>

        <div className="mt-8 border-t border-zinc-200 pt-6">
          <LegalPageLinks />
        </div>
      </section>
    </div>
  );
}
