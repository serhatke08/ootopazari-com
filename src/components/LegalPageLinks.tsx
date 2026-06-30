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

export function LegalPageLinks({ className = "" }: { className?: string }) {
  return (
    <nav
      aria-label="Yasal sayfalar"
      className={`flex flex-wrap gap-x-3 gap-y-1.5 text-xs ${className}`}
    >
      {LEGAL_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
