import type { Metadata } from "next";
import { LegalPageLinks } from "@/components/LegalPageLinks";
import { getPublicContactInfo } from "@/lib/merchant-legal";

export const metadata: Metadata = {
  title: "İletişim",
  description: "Oto Pazarı destek e-posta iletişimi.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: "/iletisim" },
};

export default function IletisimPage() {
  const contact = getPublicContactInfo();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
        <h1 className="text-3xl font-black tracking-tight text-zinc-950">
          İletişim
        </h1>
        <p className="mt-4 text-sm leading-6 text-zinc-600">
          İlan, üyelik, bayi başvurusu, ödeme ve iade talepleri için e-posta ile
          bize ulaşabilirsiniz.
        </p>

        <div className="mt-6 max-w-md rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-bold text-zinc-950">E-posta</p>
          <a
            href={`mailto:${contact.email}`}
            className="mt-1 block text-sm font-semibold text-zinc-800 underline"
          >
            {contact.email}
          </a>
          {contact.phone ? (
            <>
              <p className="mt-4 text-sm font-bold text-zinc-950">Telefon</p>
              <a
                href={`tel:${contact.phone.replace(/\s/g, "")}`}
                className="mt-1 block text-sm font-semibold text-zinc-800 underline"
              >
                {contact.phone}
              </a>
            </>
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
