import Link from "next/link";

/** Ana sayfa altı — arama motorları için görünür, doğal anahtar kelime içeriği. */
export function HomeSeoSection() {
  return (
    <section
      aria-labelledby="home-seo-heading"
      className="border-t border-zinc-200 bg-zinc-50"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 sm:py-12">
        <h2
          id="home-seo-heading"
          className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl"
        >
          Oto Pazarı — Türkiye&apos;nin araç ilan platformu
        </h2>
        <div className="mt-4 max-w-3xl space-y-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
          <p>
            <strong className="font-semibold text-zinc-800">Oto Pazarı</strong>,
            ikinci el araba ve sıfır otomobil ilanlarını tek yerde toplayan
            Türkiye geneli bir{" "}
            <strong className="font-semibold text-zinc-800">oto pazarı</strong>
            dır. Marka, model, şehir ve fiyat filtreleriyle binlerce güncel
            ilanı tarayın; favorilerinize ekleyin ve satıcıyla doğrudan
            mesajlaşın.
          </p>
          <p>
            Ücretsiz ilan vererek aracınızı Oto Pazarı&apos;nda yayınlayın.
            Galeri, ekspertiz, parça ve kiralık kategorilerinde de ilan
            oluşturabilir; güvenilir alıcı ve satıcılarla hızlıca iletişime
            geçebilirsiniz.
          </p>
        </div>
        <nav
          aria-label="Oto Pazarı kategorileri"
          className="mt-6 flex flex-wrap gap-2"
        >
          {[
            { label: "Otomobil ilanları", href: "/?q=otomobil" },
            { label: "İkinci el araba", href: "/?q=ikinci+el" },
            { label: "Sıfır araç", href: "/?q=sıfır" },
            { label: "Ücretsiz ilan ver", href: "/ilan-ver" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900 sm:text-sm"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
