"use client";

import Image from "next/image";
import {
  appStoreUrl,
  detectMobileStore,
  playStoreUrl,
  storeUrlForKind,
  type MobileStoreKind,
} from "@/lib/app-stores";
import { useEffect, useState } from "react";
import { useIsClient } from "@/hooks/use-is-client";

/** PC sol sütun: kategorinin hemen altında dikey uygulama tanıtım paneli */
export function HomeAppPromoRail() {
  const mounted = useIsClient();
  const [store, setStore] = useState<MobileStoreKind>("other");

  useEffect(() => {
    if (!mounted) return;
    setStore(detectMobileStore(navigator.userAgent));
  }, [mounted]);

  const href = storeUrlForKind(store);
  const desktop = !mounted || store === "other";

  return (
    <section
      className="mt-2 w-full overflow-hidden rounded-lg border border-black/10 bg-[#ffcc00] shadow-sm"
      aria-label="Uygulamamızı indirin"
    >
      <div className="relative">
        {desktop ? (
          <>
            <Image
              src="/promo/app-download.jpg"
              alt="Oto Pazarı mobil uygulaması"
              width={682}
              height={1024}
              className="block h-auto w-full"
              sizes="280px"
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
          </>
        ) : (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
            aria-label="Uygulamayı indir"
          >
            <Image
              src="/promo/app-download.jpg"
              alt="Oto Pazarı mobil uygulaması"
              width={682}
              height={1024}
              className="block h-auto w-full"
              sizes="280px"
            />
          </a>
        )}
      </div>
    </section>
  );
}
