"use client";

import {
  appStoreUrl,
  detectMobileStore,
  playStoreUrl,
  storeUrlForKind,
  type MobileStoreKind,
} from "@/lib/app-stores";
import { useEffect, useRef, useState } from "react";
import { useIsClient } from "@/hooks/use-is-client";

const REPLAY_EVERY_MS = 10_000;

/** PC sol sütun: kategorinin hemen altında dikey uygulama tanıtım paneli */
export function HomeAppPromoRail() {
  const mounted = useIsClient();
  const [store, setStore] = useState<MobileStoreKind>("other");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const replayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mounted) return;
    setStore(detectMobileStore(navigator.userAgent));
  }, [mounted]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const clearReplay = () => {
      if (replayTimer.current) {
        clearTimeout(replayTimer.current);
        replayTimer.current = null;
      }
    };

    const playOnce = () => {
      clearReplay();
      el.currentTime = 0;
      void el.play().catch(() => {});
    };

    const onEnded = () => {
      clearReplay();
      replayTimer.current = setTimeout(playOnce, REPLAY_EVERY_MS);
    };

    el.loop = false;
    el.addEventListener("ended", onEnded);
    playOnce();

    return () => {
      el.removeEventListener("ended", onEnded);
      clearReplay();
    };
  }, [mounted]);

  const href = storeUrlForKind(store);
  const desktop = !mounted || store === "other";

  const video = (
    <video
      ref={videoRef}
      src="/promo/sure.mp4"
      className="mx-auto block h-auto w-[78%] max-w-[220px]"
      muted
      playsInline
      preload="metadata"
      aria-label="Oto Pazarı mobil uygulaması"
    />
  );

  return (
    <section
      className="mt-2 w-full overflow-hidden rounded-lg border border-black/10 bg-[#ffcc00] px-2 py-2 shadow-sm"
      aria-label="Uygulamamızı indirin"
    >
      <div className="relative mx-auto w-fit">
        {desktop ? (
          <>
            {video}
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
            {video}
          </a>
        )}
      </div>
    </section>
  );
}
