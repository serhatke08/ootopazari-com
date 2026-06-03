import Link from "next/link";

const quickLinks = [
  { label: "+ İlan Ekle", href: "/ilan-ver" },
  { label: "Favoriler", href: "/favoriler" },
  { label: "Mesajlar", href: "/mesajlar" },
  { label: "Tüm İlanlar", href: "/ilanlar" },
] as const;

export function SiteFooter({ loggedIn = false }: { loggedIn?: boolean }) {
  const accountLinks = loggedIn
    ? [{ label: "Hesabım", href: "/profil" }]
    : [
        { label: "Giriş Yap", href: "/giris" },
        { label: "Kayıt Ol", href: "/kayit" },
      ];

  return (
    <footer className="site-footer mt-auto w-full border-t border-zinc-200 bg-zinc-50 py-8 sm:border-t-2 sm:border-amber-500/60 sm:bg-[#ffcc00] sm:py-12">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
        {/* Mobile: Compact Design */}
        <div className="sm:hidden">
          {/* Logo & Tagline */}
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-zinc-900">Oto Pazarı</h2>
            <p className="mt-1 text-xs text-zinc-600">
              Türkiye'nin araç ilan platformu
            </p>
          </div>

          {/* Quick Links Grid */}
          <div className="mb-6 grid grid-cols-2 gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-center text-sm font-medium text-zinc-900 transition active:bg-zinc-100"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Account Links */}
          <div className="mb-6 flex justify-center gap-4">
            {accountLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-center text-xs text-zinc-500">
            © {new Date().getFullYear()} Oto Pazarı
          </p>
        </div>

        {/* Desktop: Original Design */}
        <div className="hidden sm:block">
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
              <Link href="/?q=otomobil" className="site-footer-tag">
                Otomobil ilanları
              </Link>
              <Link href="/?q=ikinci+el" className="site-footer-tag">
                İkinci el araba
              </Link>
              <Link href="/?q=sıfır" className="site-footer-tag">
                Sıfır araç
              </Link>
              <Link href="/ilan-ver" className="site-footer-tag">
                Ücretsiz ilan ver
              </Link>
            </nav>
          </section>

          <div className="site-footer-links">
            <div className="site-footer-col">
              <p className="site-footer-col-title">Hızlı İşlemler</p>
              <Link href="/ilan-ver">+ İlan Ekle</Link>
              <Link href="/favoriler">Favoriler</Link>
              <Link href="/mesajlar">Mesajlar</Link>
            </div>
            <div className="site-footer-col">
              <p className="site-footer-col-title">Keşfet</p>
              <Link href="/">Ana Sayfa</Link>
              <Link href="/ilanlar">Tüm İlanlar</Link>
              <Link href="/ilan-ver">Ücretsiz İlan Ver</Link>
            </div>
            <div className="site-footer-col">
              <p className="site-footer-col-title">Hesap</p>
              {accountLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <p className="site-footer-copy">
            © {new Date().getFullYear()} Oto Pazarı · Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
}
