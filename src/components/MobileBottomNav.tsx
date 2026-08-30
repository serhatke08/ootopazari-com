"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageUnreadBadge } from "@/components/MessageUnreadBadge";

function IconHome({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconHeart({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IconMessage({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-[17px] w-[17px] shrink-0"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function MobileBottomNav({
  loggedIn,
  hasEnv,
  unreadMessageCount = 0,
}: {
  loggedIn: boolean;
  hasEnv: boolean;
  unreadMessageCount?: number;
}) {
  const pathname = usePathname();

  if (!hasEnv) return null;

  const homeActive = pathname === "/";
  const msgActive = pathname.startsWith("/mesajlar");
  const favActive = pathname.startsWith("/favoriler");
  const ilanVerActive =
    pathname === "/ilan-ver" ||
    pathname.startsWith("/ilan-duzenle") ||
    pathname.startsWith("/profil/ilanlarim");
  const accountActive = pathname.startsWith("/profil") || pathname.startsWith("/giris") || pathname.startsWith("/kayit");

  const tabBase =
    "flex min-w-0 flex-col items-center gap-0.5 rounded-md py-0.5 text-[9px] font-semibold leading-none transition-colors";
  const tabIdle = "text-zinc-700 hover:text-zinc-900";
  const tabActive = "text-zinc-900";

  const accountHref = loggedIn ? "/profil" : `/giris?next=${encodeURIComponent("/profil")}`;

  return (
    <nav
      data-mobile-bottom-nav="true"
      className="fixed inset-x-0 bottom-0 z-[100] bg-[#ffcc00] pt-[1.125rem] pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      aria-label="Alt menü"
    >
      <div className="relative border-t border-black bg-[#ffcc00]">
        <Link
          href="/ilan-ver"
          prefetch
          aria-label="İlan ver"
          className={`absolute left-1/2 top-0 z-20 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-zinc-900 text-[#ffcc00] ring-1 ring-black transition hover:bg-zinc-800 ${ilanVerActive ? "ring-2 ring-zinc-900" : ""}`}
        >
          <IconPlus />
        </Link>

        <div className="mx-auto grid max-w-lg grid-cols-5 items-end gap-0 px-0.5 pb-1.5 pt-[1.125rem]">
          <Link
            href="/"
            prefetch
            className={`${tabBase} ${homeActive ? tabActive : tabIdle}`}
          >
            <IconHome className="shrink-0" />
            <span className="max-w-[3.5rem] truncate text-center">Ana sayfa</span>
          </Link>

          <Link
            href="/mesajlar"
            prefetch
            className={`${tabBase} relative ${msgActive ? tabActive : tabIdle}`}
          >
            <span className="relative inline-flex">
              <IconMessage className="shrink-0" />
              {loggedIn && unreadMessageCount > 0 ? (
                <MessageUnreadBadge
                  count={unreadMessageCount}
                  className="absolute -right-2 -top-2 z-10 min-h-[0.95rem] min-w-[0.95rem] px-0.5 text-[9px]"
                />
              ) : null}
            </span>
            <span className="max-w-[3.5rem] truncate text-center">Mesajlar</span>
          </Link>

          <div className="flex min-w-0 flex-col items-center justify-end">
            <span className="max-w-[4rem] truncate text-center text-[9px] font-bold leading-tight text-zinc-900">
              İlan ver
            </span>
          </div>

          <Link
            href="/favoriler"
            prefetch
            className={`${tabBase} ${favActive ? tabActive : tabIdle}`}
          >
            <IconHeart className="shrink-0" />
            <span className="max-w-[3.5rem] truncate text-center">Favoriler</span>
          </Link>

          <Link
            href={accountHref}
            prefetch
            className={`${tabBase} ${accountActive ? tabActive : tabIdle}`}
          >
            <IconUser className="shrink-0" />
            <span className="max-w-[3.5rem] truncate text-center">Hesabım</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
