"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

const tabClass =
  "inline-flex items-center border-b-2 px-1 pb-3 text-sm font-medium transition-colors";
const inactive = "border-transparent text-zinc-500 hover:text-zinc-800";
const active = "border-zinc-900 text-zinc-900";

export function ProfilSubnav() {
  const pathname = usePathname();
  const isIlanlarim = pathname.startsWith("/profil/ilanlarim");

  return (
    <nav
      className="mt-2 flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200"
      aria-label="Profil bölümleri"
    >
      <div className="flex gap-6">
        <Link
          href="/profil/ilanlarim"
          className={`${tabClass} ${isIlanlarim ? active : inactive}`}
        >
          İlanlarım
        </Link>
      </div>
      <div className="pb-2">
        <LogoutButton />
      </div>
    </nav>
  );
}
