import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer
      className="mt-auto border-t border-amber-400/80 bg-[#ffcc00] py-9 text-zinc-900"
      style={{ backgroundColor: "#ffcc00" }}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="mb-7 text-center">
          <Image
            src="/Sure.png"
            alt="Oto-tr"
            width={320}
            height={112}
            className="mx-auto h-auto w-[200px] sm:w-[240px] md:w-[280px]"
          />
          <p className="mt-2 text-sm font-medium text-zinc-800">
            İlan ver, favorile, mesajlaş.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 border-t border-amber-700/30 pt-6 text-sm sm:grid-cols-3">
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-700">
              Hızlı İşlemler
            </p>
            <Link href="/ilan-ver" className="font-semibold hover:underline">
              + İlan Ekle
            </Link>
            <Link href="/favoriler" className="font-semibold hover:underline">
              Favoriler
            </Link>
            <Link href="/mesajlar" className="font-semibold hover:underline">
              Mesajlar
            </Link>
          </div>

          <div className="flex flex-col gap-2 text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-700">
              Keşfet
            </p>
            <Link href="/" className="font-semibold hover:underline">
              Ana Sayfa
            </Link>
            <Link href="/ilanlar" className="font-semibold hover:underline">
              Tüm İlanlar
            </Link>
            <Link href="/ilan-ver" className="font-semibold hover:underline">
              Ücretsiz İlan Ver
            </Link>
          </div>

          <div className="flex flex-col gap-2 text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-700">
              Hesap
            </p>
            <Link href="/profil" className="font-semibold hover:underline">
              Hesabım
            </Link>
            <Link href="/giris" className="font-semibold hover:underline">
              Giriş Yap
            </Link>
            <Link href="/kayit" className="font-semibold hover:underline">
              Kayıt Ol
            </Link>
          </div>
        </div>

        <div className="mt-6 border-t border-amber-700/30 pt-4 text-center text-xs font-medium text-zinc-800">
          © {new Date().getFullYear()} Oto · Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}
