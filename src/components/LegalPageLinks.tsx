import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/iletisim", label: "İletişim" },
  { href: "/mesafeli-satis-sozlesmesi", label: "Mesafeli Satış" },
  { href: "/on-bilgilendirme-formu", label: "Ön Bilgilendirme" },
  { href: "/teslimat-kosullari", label: "Teslimat" },
  { href: "/iade-iptal-politikasi", label: "İade ve İptal" },
  { href: "/gizlilik-politikasi", label: "Gizlilik" },
  { href: "/kullanim-kosullari", label: "Kullanım Koşulları" },
] as const;

export function LegalPageLinks({
  className = "",
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "onDark";
}) {
  const linkClass =
    tone === "onDark"
      ? "text-white/65 underline-offset-2 hover:text-white hover:underline"
      : "text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline";

  return (
    <nav
      aria-label="Yasal sayfalar"
      className={`flex flex-wrap gap-x-3 gap-y-1.5 text-xs ${className}`}
    >
      {LEGAL_LINKS.map((link) => (
        <Link key={link.href} href={link.href} className={linkClass}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
