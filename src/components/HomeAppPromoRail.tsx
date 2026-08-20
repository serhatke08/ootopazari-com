import Image from "next/image";
import { appStoreUrl, playStoreUrl } from "@/lib/app-stores";

/** PC sol sütun: kategorinin hemen altında dikey uygulama tanıtım paneli */
export function HomeAppPromoRail() {
  return (
    <section
      className="mt-2 w-full overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm"
      aria-label="Uygulamamızı indirin"
    >
      <div className="relative">
        <Image
          src="/promo/app-download.jpg"
          alt="Oto Pazarı mobil uygulaması"
          width={682}
          height={1024}
          className="block h-auto w-full"
          sizes="280px"
          priority
        />
        <a
          href={playStoreUrl()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Google Play’den indir"
          className="absolute bottom-[3.5%] left-[8%] h-[9.5%] w-[40%] rounded-md"
        />
        <a
          href={appStoreUrl()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="App Store’dan indir"
          className="absolute bottom-[3.5%] right-[8%] h-[9.5%] w-[40%] rounded-md"
        />
      </div>
    </section>
  );
}
