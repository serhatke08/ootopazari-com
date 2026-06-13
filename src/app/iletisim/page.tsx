import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İletişim",
  description: "Oto Pazarı iletişim ve destek bilgileri.",
  alternates: {
    canonical: "/iletisim",
  },
};

export default function IletisimPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
        <h1 className="text-3xl font-black tracking-tight text-zinc-950">
          İletişim
        </h1>
        <p className="mt-4 text-sm leading-6 text-zinc-600">
          İlan, üyelik, bayi başvurusu ve ödeme destek talepleri için aşağıdaki
          kanallardan bize ulaşabilirsiniz.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-bold text-zinc-950">E-posta</p>
            <a
              href="mailto:destek@otopazari.com"
              className="mt-1 block text-sm text-zinc-700 underline"
            >
              destek@otopazari.com
            </a>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-bold text-zinc-950">Destek kapsamı</p>
            <p className="mt-1 text-sm leading-6 text-zinc-700">
              İlan yayını, hesap erişimi, ödeme kontrolü, iade/iptal talepleri
              ve teknik sorunlar.
            </p>
          </div>
        </div>
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          Kart bilgileriniz Oto Pazarı tarafından alınmaz veya saklanmaz. Web
          ödemeleri PayTR güvenli ödeme altyapısı üzerinden işlenir.
        </div>
      </section>
    </div>
  );
}
