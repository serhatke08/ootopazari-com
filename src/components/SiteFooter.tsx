import Link from "next/link";

export function SiteFooter({ loggedIn = false }: { loggedIn?: boolean }) {
  return (
    <footer
      className="mt-auto border-t border-amber-400/80 bg-[#ffcc00] py-9 text-zinc-900"
      style={{ backgroundColor: "#ffcc00" }}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="mb-7 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl md:text-4xl">
            Oto Pazarı
          </h2>
          <p className="mt-3 text-sm font-medium text-zinc-800 sm:mt-4">
            İlan ver, favorile, mesajlaş.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-x-2 gap-y-5 border-t border-amber-700/30 pt-6 text-[11px] leading-snug sm:gap-x-6 sm:gap-y-6 sm:text-sm md:gap-x-10">
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
