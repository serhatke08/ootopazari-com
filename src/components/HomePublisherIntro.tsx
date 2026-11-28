import Link from "next/link";

/** AdSense / tarayıcı için ana sayfada sabit orijinal metin (yalnızca kart ızgarası olmasın). */
export function HomePublisherIntro() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 pb-3 pt-2 sm:px-6">
      <h1 className="text-lg font-extrabold tracking-tight text-zinc-950 sm:text-xl">
        Oto Pazarı — ikinci el ve sıfır araç ilanları
      </h1>
      <p className="mt-1.5 max-w-3xl text-sm leading-6 text-zinc-600">
        Türkiye genelinde otomobil, motosiklet, ticari araç, yedek parça ve
        kiralık araç ilanlarını marka, model, motor ve paket bilgisiyle
        karşılaştırın. Ücretsiz ilan verin; satıcıyla siteden mesajlaşın.
        Galeri, ekspertiz ve parçacı bayilerini de aynı yerden bulun.
      </p>
      <nav
        aria-label="Site hakkında"
        className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-zinc-700"
      >
        <Link href="/hakkimizda" className="underline-offset-2 hover:underline">
          Hakkımızda
        </Link>
        <Link href="/iletisim" className="underline-offset-2 hover:underline">
          İletişim
        </Link>
        <Link
          href="/gizlilik-politikasi"
          className="underline-offset-2 hover:underline"
        >
          Gizlilik
        </Link>
        <Link href="/rehber" className="underline-offset-2 hover:underline">
          Rehber
        </Link>
        <Link href="/ikinci-el-arac" className="underline-offset-2 hover:underline">
          İkinci el araç
        </Link>
      </nav>
    </section>
  );
}
