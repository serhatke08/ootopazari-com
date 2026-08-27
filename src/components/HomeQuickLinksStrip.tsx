"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { QUICK_ACCESS_LINKS } from "@/lib/quick-access-links";

function dealerBorderColor(label: string): string {
  const key = label.trim().toLocaleLowerCase("tr");
  if (key === "ekspertiz") return "#a91414";
  if (key === "galeri") return "#5e17eb";
  if (key === "parça") return "#2e6417";
  if (key === "kiralama") return "#0081cc";
  if (key === "pazar") return "#111111";
  if (key === "acil") return "#dc2626";
  if (key === "vitrin" || key === "sıfır araçlar" || key === "sifir araclar")
    return "#059669";
  return "#f59e0b";
}

function QuickLinkItem({
  href,
  label,
  image,
}: {
  href: string;
  label: string;
  image?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex w-[4.25rem] shrink-0 flex-col items-center gap-0.5 sm:w-[4.5rem]"
    >
      <span
        className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 bg-white ring-1 ring-zinc-900/10 transition group-hover:brightness-110"
        style={{ borderColor: dealerBorderColor(label) }}
      >
        {image ? (
          image.endsWith(".svg") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <Image
              src={image}
              alt=""
              fill
              className="object-cover"
              sizes="40px"
            />
          )
        ) : (
          <span className="text-[10px] font-bold text-zinc-700">
            {label.slice(0, 1)}
          </span>
        )}
      </span>
      <span className="w-full text-center text-[9px] font-medium leading-tight text-zinc-800">
        {label}
      </span>
    </Link>
  );
}

/** Bayilik şeridi: taşan öğeler yavaş sola kayar (marquee). */
export function HomeQuickLinksStrip() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [loop, setLoop] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const measure = () => {
      const parent = el.parentElement;
      if (!parent) return;
      // Tek set genişliği ekranı aşıyorsa döngü animasyonu aç
      const half = el.scrollWidth / 2;
      setLoop(half > parent.clientWidth + 8);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, []);

  const items = [...QUICK_ACCESS_LINKS, ...QUICK_ACCESS_LINKS];

  return (
    <div className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-[1400px] sm:px-4 md:px-6">
        <div
          className="relative overflow-hidden px-2 py-1.5"
          role="list"
          aria-label="Bayilik kısayolları"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          <div
            ref={trackRef}
            className={`flex w-max gap-1.5 ${
              loop ? "home-quick-links-marquee" : ""
            } ${paused ? "home-quick-links-marquee-paused" : ""}`}
          >
            {items.map((d, i) => (
              <div
                key={`${d.href}-${i}`}
                role="listitem"
                aria-hidden={i >= QUICK_ACCESS_LINKS.length ? true : undefined}
              >
                <QuickLinkItem
                  href={d.href}
                  label={d.label}
                  image={d.image}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
