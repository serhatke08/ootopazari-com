"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useIsClient } from "@/hooks/use-is-client";
import {
  PRICE_RATING_OPTIONS,
  priceRatingIndicatorColor,
  summaryAfterVote,
  type PriceRatingSummary,
  type PriceRatingValue,
} from "@/lib/listing-price-ratings";

type Props = {
  listingId: string;
  summary: PriceRatingSummary;
  loggedIn: boolean;
  size?: "sm" | "md";
  popoverPlacement?: "above" | "below";
};

type AnchorRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function ListingPriceRatingDot({
  listingId,
  summary: initialSummary,
  loggedIn,
  size = "md",
  popoverPlacement = "above",
}: Props) {
  const router = useRouter();
  const mounted = useIsClient();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState(initialSummary);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSummary(initialSummary);
  }, [initialSummary]);

  const updateAnchor = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setAnchor({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateAnchor();

    function onScrollOrResize() {
      updateAnchor();
    }
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    let removeDocListeners: (() => void) | null = null;
    const timer = window.setTimeout(() => {
      function onDoc(e: MouseEvent) {
        const t = e.target as Node;
        if (btnRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
        setOpen(false);
      }
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("touchstart", onDoc as EventListener);
      removeDocListeners = () => {
        document.removeEventListener("mousedown", onDoc);
        document.removeEventListener("touchstart", onDoc as EventListener);
      };
    }, 0);

    return () => {
      window.clearTimeout(timer);
      removeDocListeners?.();
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updateAnchor]);

  const dotSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  const color = priceRatingIndicatorColor(summary.average, summary.count);

  const submitVote = useCallback(
    async (rating: PriceRatingValue) => {
      if (!loggedIn) {
        const path =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "/";
        window.location.href = `/giris?next=${encodeURIComponent(path)}`;
        return;
      }
      setPending(true);
      setError(null);
      try {
        const res = await fetch("/api/listings/price-rating", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId, rating }),
        });
        const body = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !body.ok) {
          setError(body.message ?? "Oy kaydedilemedi.");
          return;
        }
        setSummary((prev) => summaryAfterVote(prev, rating));
        setOpen(false);
        router.refresh();
      } catch {
        setError("Bağlantı kurulamadı.");
      } finally {
        setPending(false);
      }
    },
    [listingId, loggedIn, router]
  );

  const toggleOpen = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!open) updateAnchor();
      setOpen((o) => !o);
    },
    [open, updateAnchor]
  );

  const popoverStyle: React.CSSProperties | undefined = anchor
    ? popoverPlacement === "below"
      ? {
          position: "fixed",
          top: anchor.top + anchor.height + 8,
          left: Math.min(anchor.left, window.innerWidth - 280),
          zIndex: 300,
        }
      : {
          position: "fixed",
          top: anchor.top - 8,
          left: Math.min(anchor.left, window.innerWidth - 280),
          transform: "translateY(-100%)",
          zIndex: 300,
        }
    : undefined;

  const popover =
    open && anchor ? (
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="w-[min(17rem,calc(100vw-2rem))] rounded-xl border border-black/10 bg-white p-3 shadow-xl"
        role="dialog"
        aria-label="Fiyat değerlendir"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-black">
          Fiyatı nasıl buldunuz?
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {PRICE_RATING_OPTIONS.map((opt) => {
            const active = summary.userRating === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={pending}
                onClick={() => void submitVote(opt.value)}
                className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-sm transition disabled:opacity-60 ${
                  active
                    ? "border-black/25 bg-black/[0.04] font-medium"
                    : "border-black/10 hover:border-black/20 hover:bg-black/[0.02]"
                }`}
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: opt.color }}
                />
                <span className="text-black">{opt.label}</span>
              </button>
            );
          })}
        </div>
        {error ? (
          <p className="mt-2 text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    ) : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={toggleOpen}
        className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition hover:bg-black/5 focus-visible:outline focus-visible:ring-2 focus-visible:ring-black/25"
        aria-label="Fiyat değerlendirmesi"
        aria-expanded={open}
      >
        <span
          className={`block rounded-full ${dotSize}`}
          style={{ backgroundColor: color }}
        />
      </button>
      {mounted && popover ? createPortal(popover, document.body) : null}
    </>
  );
}
