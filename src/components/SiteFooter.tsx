import Link from "next/link";
import { SEO_GUIDE_PAGES } from "@/lib/seo-guides";

const categoryLinks = [
  { label: "Otomobil ilanları", href: "/?q=otomobil" },
  { label: "İkinci el araba", href: "/?q=ikinci+el" },
  { label: "Sıfır araç", href: "/?q=sıfır" },
  { label: "Ücretsiz ilan ver", href: "/ilan-ver" },
] as const;

const linkColumns = [
  {
    title: "Hızlı İşlemler",
    links: [
      { label: "+ İlan Ekle", href: "/ilan-ver" },
      { label: "Favoriler", href: "/favoriler" },
      { label: "Mesajlar", href: "/mesajlar" },
    ],
  },
  {
    title: "Keşfet",
    links: [
      { label: "Ana Sayfa", href: "/" },
      { label: "Tüm İlanlar", href: "/ilanlar" },
      { label: "Ücretsiz İlan Ver", href: "/ilan-ver" },
    ],
  },
  {
    title: "Rehber",
    links: [
      { label: "Tüm rehberler", href: "/rehber" },
      ...SEO_GUIDE_PAGES.slice(0, 4).map((g) => ({
        label: g.navLabel,
        href: `/rehber/${g.slug}`,
      })),
    ],
  },
] as const;

export function SiteFooter({ loggedIn = false }: { loggedIn?: boolean }) {
  const accountLinks = loggedIn
    ? [{ label: "Hesabım", href: "/profil" }]
    : [
        { label: "Hesabım", href: "/profil" },
        { label: "Giriş Yap", href: "/giris" },
        { label: "Kayıt Ol", href: "/kayit" },
      ];

  return (
    <footer
      className="mt-auto w-full border-t border-amber-400/80 bg-[#ffcc00] py-10 text-zinc-900 sm:py-12"
      style={{ backgroundColor: "#ffcc00" }}
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
        <section
          aria-labelledby="footer-seo-heading"
          className="site-footer-seo"
        >
          <h2
            id="footer-seo-heading"
            className="text-2xl font-black leading-snug tracking-tight text-zinc-950 sm:text-3xl"
          >
            Oto Pazarı — Türkiye&apos;nin araç ilan platformu
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-zinc-800 sm:text-base">
            <p>
              <strong className="font-bold text-zinc-950">Oto Pazarı</strong>, ikinci
              el araba ve sıfır otomobil ilanlarını tek yerde toplayan Türkiye
              geneli bir{" "}
              <strong className="font-bold text-zinc-950">oto pazarı</strong>
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
          <nav aria-label="Oto Pazarı kategorileri" className="mt-6">
            {categoryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex rounded-full border border-zinc-900/20 bg-white px-4 py-1.5 text-xs font-semibold text-zinc-900 transition hover:border-zinc-900/40 sm:text-sm"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </section>

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-8 border-t border-amber-700/30 pt-8 text-center sm:grid-cols-4 sm:gap-6">
          {[...linkColumns, { title: "Hesap", links: accountLinks }].map(
            (col) => (
              <div key={col.title} className="flex flex-col items-center gap-2 text-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  {col.title}
                </p>
                {col.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="font-semibold text-zinc-900 hover:underline"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )
          )}
        </div>

        <p className="mt-8 border-t border-amber-700/30 pt-5 text-center text-xs font-medium text-zinc-800">
          © {new Date().getFullYear()} Oto Pazarı · Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  );
}
