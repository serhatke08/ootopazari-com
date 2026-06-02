import Link from "next/link";
import { SEO_GUIDE_PAGES } from "@/lib/seo-guides";

const categoryLinks = [
  { label: "Otomobil ilanları", href: "/?q=otomobil" },
  { label: "İkinci el araba", href: "/?q=ikinci+el" },
  { label: "Sıfır araç", href: "/?q=sıfır" },
  { label: "Ücretsiz ilan ver", href: "/ilan-ver" },
] as const;

export function SiteFooter({ loggedIn = false }: { loggedIn?: boolean }) {
  return (
    <footer
      className="mt-auto border-t border-amber-400/80 bg-[#ffcc00] py-9 text-zinc-900"
      style={{ backgroundColor: "#ffcc00" }}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <section aria-labelledby="footer-seo-heading" className="mb-8">
          <h2
            id="footer-seo-heading"
            className="text-lg font-extrabold tracking-tight text-zinc-900 sm:text-xl md:text-2xl"
          >
            Oto Pazarı — Türkiye&apos;nin araç ilan platformu
          </h2>
          <div className="mt-3 max-w-3xl space-y-2.5 text-xs leading-relaxed text-zinc-800 sm:text-sm">
            <p>
              <strong className="font-semibold text-zinc-900">Oto Pazarı</strong>
              , ikinci el araba ve sıfır otomobil ilanlarını tek yerde toplayan
              Türkiye geneli bir{" "}
              <strong className="font-semibold text-zinc-900">oto pazarı</strong>
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
            className="mt-4 flex flex-wrap gap-2"
          >
            {categoryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-zinc-900/15 bg-white/80 px-3 py-1 text-[11px] font-semibold text-zinc-800 transition hover:border-zinc-900/30 hover:bg-white sm:text-xs"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </section>

        <div className="grid grid-cols-2 gap-x-4 gap-y-6 border-t border-amber-700/30 pt-6 text-[11px] leading-snug sm:grid-cols-4 sm:gap-x-6 sm:text-sm">
          <div className="flex min-w-0 flex-col gap-1.5 text-left sm:gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-700 sm:text-xs">
              Hızlı İşlemler
            </p>
            <Link
              href="/ilan-ver"
              className="break-words font-semibold hover:underline"
            >
              + İlan Ekle
            </Link>
            <Link href="/favoriler" className="break-words font-semibold hover:underline">
              Favoriler
            </Link>
            <Link href="/mesajlar" className="break-words font-semibold hover:underline">
              Mesajlar
            </Link>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5 text-left sm:gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-700 sm:text-xs">
              Keşfet
            </p>
            <Link href="/" className="break-words font-semibold hover:underline">
              Ana Sayfa
            </Link>
            <Link href="/ilanlar" className="break-words font-semibold hover:underline">
              Tüm İlanlar
            </Link>
            <Link href="/ilan-ver" className="break-words font-semibold hover:underline">
              Ücretsiz İlan Ver
            </Link>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5 text-left sm:gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-700 sm:text-xs">
              Rehber
            </p>
            <Link href="/rehber" className="break-words font-semibold hover:underline">
              Tüm rehberler
            </Link>
            {SEO_GUIDE_PAGES.slice(0, 4).map((guide) => (
              <Link
                key={guide.slug}
                href={`/rehber/${guide.slug}`}
                className="break-words font-semibold hover:underline"
              >
                {guide.navLabel}
              </Link>
            ))}
          </div>

          <div className="flex min-w-0 flex-col gap-1.5 text-left sm:gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-700 sm:text-xs">
              Hesap
            </p>
            <Link href="/profil" className="break-words font-semibold hover:underline">
              Hesabım
            </Link>
            {loggedIn ? null : (
              <>
                <Link href="/giris" className="break-words font-semibold hover:underline">
                  Giriş Yap
                </Link>
                <Link href="/kayit" className="break-words font-semibold hover:underline">
                  Kayıt Ol
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-amber-700/30 pt-4 text-center text-xs font-medium text-zinc-800">
          © {new Date().getFullYear()} Oto Pazarı · Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}
