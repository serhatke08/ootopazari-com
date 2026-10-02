"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WEB_EIDS_UI_ENABLED } from "@/lib/eids-ui";

const tabClass =
  "inline-flex items-center gap-1.5 border-b-2 px-1 pb-3 text-sm font-medium transition-colors";
const inactive = "border-transparent text-zinc-500 hover:text-zinc-800";
const active = "border-[#ffcc00] text-zinc-900";

type Props = {
  isAdmin?: boolean;
};

export function ProfilSubnav({ isAdmin = false }: Props) {
  const pathname = usePathname();
  const isIlanlarim = pathname.startsWith("/profil/ilanlarim");
  const isEids = pathname.startsWith("/profil/eids");
  const isOdemeler = pathname.startsWith("/profil/odemeler");
  const isDestek = pathname.startsWith("/profil/destek");
  const isAdminIlanlar = pathname.startsWith("/profil/admin/ilanlar");

  return (
    <nav
      className="mt-1 flex flex-wrap items-end gap-5 border-b border-zinc-200 sm:gap-6"
      aria-label="Profil bölümleri"
    >
      <Link
        href="/profil/ilanlarim"
        className={`${tabClass} ${isIlanlarim ? active : inactive}`}
      >
        İlanlarım
      </Link>
      {WEB_EIDS_UI_ENABLED ? (
        <Link
          href="/profil/eids"
          className={`${tabClass} ${isEids ? active : inactive}`}
        >
          <Image
            src="/branding/edevlet_icon.png"
            alt=""
            width={16}
            height={16}
            className="h-4 w-4 object-contain"
            unoptimized
          />
          e-Devlet
        </Link>
      ) : null}
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
        <Link
          href="/profil/admin/ilanlar"
          className={`${tabClass} ${isAdminIlanlar ? active : inactive}`}
        >
          Admin ilanlar
        </Link>
      ) : null}
    </nav>
  );
}
