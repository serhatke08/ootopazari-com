"use client";

const BRAND = "otopazarı.com";

type Props = {
  className?: string;
  /** Profil alt sekmeleri gibi layout zaten duruyorsa daha kısa alan */
  compact?: boolean;
  /** Parent yüksekliği veriyorsa (fixed overlay) — ekstra minHeight yok */
  fill?: boolean;
};

/**
 * Navbar–footer arasını doldurur; footer yukarı zıplamaz.
 * Gri skeleton yok — sadece marka harf animasyonu.
 */
export function BrandPagePlaceholder({
  className = "",
  compact = false,
  fill = false,
}: Props) {
  return (
    <div
      className={`flex w-full flex-1 flex-col items-center justify-center bg-zinc-50 ${
        fill ? "h-full min-h-0" : ""
      } ${className}`}
      style={
        fill
          ? undefined
          : {
              minHeight: compact
                ? "min(48vh, 22rem)"
                : "calc(100dvh - 9.5rem)",
            }
      }
      aria-busy="true"
      aria-live="polite"
      aria-label="Sayfa yükleniyor"
    >
      <div className="flex w-full max-w-5xl flex-col items-center justify-center px-4 py-10 sm:px-6">
        <p
          className="brand-letter-row select-none text-center font-bold tracking-tight text-[#ffcc00]/45"
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
          className="mt-5 h-px w-[min(18rem,70%)] bg-gradient-to-r from-transparent via-[#ffcc00]/45 to-transparent"
          aria-hidden
        />
      </div>
    </div>
  );
}
