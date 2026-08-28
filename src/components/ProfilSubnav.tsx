"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabClass =
  "inline-flex items-center border-b-2 px-1 pb-3 text-sm font-medium transition-colors";
const inactive = "border-transparent text-zinc-500 hover:text-zinc-800";
const active = "border-zinc-900 text-zinc-900";

type Props = {
  isAdmin?: boolean;
};

export function ProfilSubnav({ isAdmin = false }: Props) {
  const pathname = usePathname();
  const isIlanlarim = pathname.startsWith("/profil/ilanlarim");
  const isOdemeler = pathname.startsWith("/profil/odemeler");
  const isDestek = pathname.startsWith("/profil/destek");
  const isAdminIlanlar = pathname.startsWith("/profil/admin/ilanlar");
  const isAdminKalite = pathname.startsWith("/profil/admin/kalite-onay");

  return (
    <nav
      className="mt-2 flex flex-wrap items-end gap-6 border-b border-zinc-200"
      aria-label="Profil bölümleri"
    >
      <Link
        href="/profil/ilanlarim"
        className={`${tabClass} ${isIlanlarim ? active : inactive}`}
      >
        İlanlarım
      </Link>
      <Link
        href="/profil/odemeler"
        className={`${tabClass} ${isOdemeler ? active : inactive}`}
      >
        Ödemeler
      </Link>
      <Link
        href="/profil/destek"
        className={`${tabClass} ${isDestek ? active : inactive}`}
      >
        Destek
      </Link>
      {isAdmin ? (
        <>
          <Link
            href="/profil/admin/ilanlar"
            className={`${tabClass} ${isAdminIlanlar ? active : inactive}`}
          >
            Admin ilanlar
          </Link>
          <Link
            href="/profil/admin/kalite-onay"
            className={`${tabClass} ${isAdminKalite ? active : inactive}`}
          >
            Kalite onayı
          </Link>
        </>
      ) : null}
    </nav>
  );
}
