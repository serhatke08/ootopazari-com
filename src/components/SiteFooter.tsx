import Link from "next/link";
import { LegalPageLinks } from "@/components/LegalPageLinks";

const quickLinks = (hasListings: boolean) =>
  [
    { label: "+ İlan Ekle", href: "/ilan-ver" },
    ...(hasListings
      ? [{ label: "İlan Öne Çıkar", href: "/ilan-one-cikar" } as const]
      : []),
    { label: "Favoriler", href: "/favoriler" },
    { label: "Mesajlar", href: "/mesajlar" },
  ] as const;

export function SiteFooter({
  loggedIn = false,
  hasListings = false,
}: {
  loggedIn?: boolean;
  hasListings?: boolean;
}) {
  const links = quickLinks(hasListings);
  const accountLinks = loggedIn
    ? [{ label: "Hesabım", href: "/profil" }]
    : [
        { label: "Giriş Yap", href: "/giris" },
        { label: "Kayıt Ol", href: "/kayit" },
      ];

  return (
    <footer className="site-footer relative mt-auto hidden w-full overflow-hidden border-t border-white/10 py-8 sm:py-12 md:block">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[#0a0a0a] bg-[url('/promo/footer-bg.png')] bg-repeat bg-[length:420px_420px] sm:bg-[length:520px_520px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/70 to-black/85"
      />

      <div className="relative z-[1] mx-auto w-full max-w-[1400px] px-4 sm:px-6">
        {/* Mobile */}
        <div className="sm:hidden">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-white">Oto Pazarı</h2>
            <p className="mt-1 text-xs text-white/65">
              İkinci el araba ve sıfır araba ilanları
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-white/15 bg-white/10 px-4 py-2.5 text-center text-sm font-medium text-white backdrop-blur-[2px] transition active:bg-white/20"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mb-6 flex justify-center gap-4">
            {accountLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white/75 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mb-6 border-t border-white/10 pt-4">
            <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-white/45">
              Yasal
            </p>
            <LegalPageLinks tone="onDark" className="justify-center" />
          </div>

          <p className="text-center text-xs text-white/45">
            © {new Date().getFullYear()} Oto Pazarı
          </p>
        </div>

        {/* Desktop */}
        <div className="hidden sm:block">
          <section
            aria-labelledby="footer-seo-heading"
            className="site-footer-seo"
          >
            <h2 id="footer-seo-heading">
              Oto Pazarı — İkinci el araba ve sıfır araba ilanları
            </h2>
            <div className="site-footer-seo-text">
              <p>
                <strong>Oto Pazarı</strong>, ikinci el araba ve sıfır araba
                ilanlarını tek yerde toplayan Türkiye geneli bir{" "}
                <strong>oto pazarı</strong>
                dır. İkinci el otomobil ve sıfır otomobil ilanlarını marka,
                model, şehir ve fiyat filtreleriyle tarayın; ücretsiz araba
                ilanı verin ve satıcıyla doğrudan mesajlaşın.
              </p>
              <p>
                Ücretsiz araba ilanı vererek ikinci el araba veya sıfır araba
                ilanınızı Oto Pazarı&apos;nda yayınlayın. Galeri, ekspertiz,
                parça ve kiralık kategorilerinde de ilan oluşturabilirsiniz.
              </p>
            </div>
            <nav aria-label="Oto Pazarı kategorileri" className="site-footer-tags">
              <Link href="/" className="site-footer-tag">
                Oto pazarı
              </Link>
              <Link href="/?q=ikinci+el+araba" className="site-footer-tag">
                İkinci el araba
              </Link>
              <Link href="/?q=sıfır+araba" className="site-footer-tag">
                Sıfır araba
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
              {hasListings ? (
                <Link href="/ilan-one-cikar">İlan Öne Çıkar</Link>
              ) : null}
            </div>
            <div className="site-footer-col">
              <p className="site-footer-col-title">Hesap</p>
              {accountLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="site-footer-col">
              <p className="site-footer-col-title">Kurumsal</p>
              <Link href="/hakkimizda">Hakkımızda</Link>
              <Link href="/iletisim">İletişim</Link>
              <Link href="/on-bilgilendirme-formu">Ön Bilgilendirme</Link>
              <Link href="/teslimat-kosullari">Teslimat Koşulları</Link>
              <Link href="/mesafeli-satis-sozlesmesi">Mesafeli Satış</Link>
              <Link href="/iade-iptal-politikasi">İade ve İptal</Link>
              <Link href="/gizlilik-politikasi">Gizlilik Politikası</Link>
              <Link href="/kullanim-kosullari">Kullanım Koşulları</Link>
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
