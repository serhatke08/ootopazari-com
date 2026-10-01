"use client";

const BRAND = "otopazarı.com";

type Props = {
  className?: string;
  /** Profil alt sekmeleri gibi layout zaten duruyorsa daha kısa alan */
  compact?: boolean;
};

/**
 * Sayfa geçişinde navbar–footer arasını doldurur; footer yukarı zıplamaz.
 * Soluk sarı marka + harf harf animasyon.
 */
export function BrandPagePlaceholder({
  className = "",
  compact = false,
}: Props) {
  return (
    <div
      className={`flex w-full flex-1 flex-col bg-zinc-50 ${className}`}
      style={{
        minHeight: compact ? "min(52vh, 28rem)" : "calc(100dvh - 9.5rem)",
      }}
      aria-busy="true"
      aria-live="polite"
      aria-label="Sayfa yükleniyor"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-[#ffcc00]/25 bg-white/50 px-4 py-14 sm:py-20">
          <p
            className="brand-letter-row select-none text-center font-bold tracking-tight text-[#ffcc00]/40"
            style={{ fontSize: "clamp(1.6rem, 6.5vw, 3.5rem)" }}
            aria-hidden
          >
            {BRAND.split("").map((ch, i) => (
              <span
                key={`${ch}-${i}`}
                className="brand-letter inline-block"
                style={{ animationDelay: `${i * 42}ms` }}
              >
                {ch}
              </span>
            ))}
          </p>
          <div
            className="mt-5 h-px w-[min(18rem,70%)] bg-gradient-to-r from-transparent via-[#ffcc00]/40 to-transparent"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
