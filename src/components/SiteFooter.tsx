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
      className="site-footer mt-auto w-full border-t border-amber-400/80 bg-[#ffcc00] py-8 sm:py-9"
      style={{ backgroundColor: "#ffcc00" }}
    >
      <div className="site-footer-inner">
        <section
          aria-labelledby="footer-seo-heading"
          className="site-footer-seo"
        >
          <h2 id="footer-seo-heading">
            Oto Pazarı — Türkiye&apos;nin araç ilan platformu
          </h2>
          <div className="site-footer-seo-text">
            <p>
              <strong>Oto Pazarı</strong>, ikinci el araba ve sıfır otomobil
              ilanlarını tek yerde toplayan Türkiye geneli bir{" "}
              <strong>oto pazarı</strong>
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
          <nav aria-label="Oto Pazarı kategorileri" className="site-footer-tags">
            {categoryLinks.map((link) => (
              <Link key={link.href} href={link.href} className="site-footer-tag">
                {link.label}
              </Link>
            ))}
          </nav>
        </section>

        <div className="site-footer-links">
          {[...linkColumns, { title: "Hesap", links: accountLinks }].map(
            (col) => (
              <div key={col.title} className="site-footer-col">
                <p className="site-footer-col-title">{col.title}</p>
                {col.links.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            )
          )}
        </div>

        <p className="site-footer-copy">
          © {new Date().getFullYear()} Oto Pazarı · Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  );
}
