"use client";

import {
  appStoreUrl,
  playStoreUrl,
} from "@/lib/app-stores";
import { useEffect, useRef } from "react";

const REPLAY_EVERY_MS = 10_000;
const PROMO_YELLOW = "#ffcc00";

/** PC sol sütun: kategorinin hemen altında dikey uygulama tanıtım paneli */
export function HomeAppPromoRail() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const replayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
      void el.play().catch(() => {});
    };

    const onEnded = () => {
      clearReplay();
      replayTimer.current = setTimeout(playOnce, REPLAY_EVERY_MS);
    };

    el.muted = true;
    el.playsInline = true;
    el.loop = false;
    el.addEventListener("ended", onEnded);
    playOnce();

    return () => {
      el.removeEventListener("ended", onEnded);
      clearReplay();
      el.pause();
    };
  }, []);

  return (
    <section
      className="mt-2 w-full overflow-hidden rounded-lg border border-black/10 shadow-sm"
      style={{ backgroundColor: PROMO_YELLOW }}
      aria-label="Uygulamamızı indirin"
    >
      <div
        className="relative mx-auto w-[82%] max-w-[200px] py-2"
        style={{ backgroundColor: PROMO_YELLOW }}
      >
        <video
          ref={videoRef}
          src="/promo/sure.mp4"
          className="block h-auto w-full"
          style={{ backgroundColor: PROMO_YELLOW }}
          muted
          playsInline
          preload="auto"
          aria-label="Oto Pazarı mobil uygulaması"
        />
        <a
          href={playStoreUrl()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Google Play’den indir"
          className="absolute bottom-[3.5%] left-[8%] z-10 h-[9.5%] w-[40%] rounded-md"
        />
        <a
          href={appStoreUrl()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="App Store’dan indir"
          className="absolute bottom-[3.5%] right-[8%] z-10 h-[9.5%] w-[40%] rounded-md"
        />
      </div>
    </section>
  );
}
