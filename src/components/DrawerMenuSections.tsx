"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MessageUnreadBadge } from "@/components/MessageUnreadBadge";
import type { BayiApplicationMenuRow } from "@/lib/bayi-applications";
import { initialFromName } from "@/lib/user-display-name";

function IconPlusGreen({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-white shadow-sm ${className ?? ""}`}
      aria-hidden
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </span>
  );
}

function IconHeartRed({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 ${className ?? ""}`}
      aria-hidden
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </span>
  );
}

function IconMessageBlue({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 ${className ?? ""}`}
      aria-hidden
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </span>
  );
}

function IconBoostAmber({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 ${className ?? ""}`}
      aria-hidden
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
      </svg>
    </span>
  );
}

const rowClass =
  "flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[11px] font-medium leading-snug text-zinc-900 shadow-sm transition hover:border-[#ffcc00] hover:bg-amber-50/50";

const DRAWER_HEADER_BG =
  "bg-[#0a0a0a] bg-[url('/promo/footer-bg.png')] bg-repeat bg-[length:280px_280px] sm:bg-[length:340px_340px]";

function DrawerPersonalHeader({
  loggedIn,
  displayName,
  avatarUrl,
  onNavigate,
  onClose,
}: {
  loggedIn: boolean;
  displayName: string;
  avatarUrl: string | null;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  return (
    <div className={`relative shrink-0 overflow-hidden ${DRAWER_HEADER_BG}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/70 to-black/85"
      />
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-[max(0.5rem,env(safe-area-inset-top,0px))] z-10 rounded-md p-1.5 text-white/90 transition hover:bg-white/15"
          aria-label="Menüyü kapat"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      ) : null}
      <div className="relative px-3 py-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        {loggedIn ? (
          <Link
            href="/profil"
            onClick={() => onNavigate?.()}
            className="flex items-center gap-3 rounded-lg transition hover:opacity-95"
          >
            <DrawerProfileAvatar
              displayName={displayName}
              avatarUrl={avatarUrl}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {displayName}
              </p>
              <p className="text-[11px] text-white/70">Profilim</p>
            </div>
          </Link>
        ) : (
          <div className="space-y-3 text-center">
            <p className="text-sm font-medium text-white/90">
              Kişisel menü için giriş yapın.
            </p>
            <Link
              href="/giris"
              onClick={() => onNavigate?.()}
              className="mx-auto inline-flex w-full max-w-[11rem] items-center justify-center rounded-md border border-green-500/70 bg-green-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-green-700"
            >
              Giriş
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function DrawerProfileAvatar({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl: string | null;
}) {
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const showPhoto = Boolean(avatarUrl) && brokenSrc !== avatarUrl;
  const initial = initialFromName(displayName);

  return (
    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-700 ring-2 ring-white/80">
      {showPhoto ? (
        <Image
          src={avatarUrl as string}
          alt=""
          width={36}
          height={36}
          unoptimized
          referrerPolicy="no-referrer"
          className="h-9 w-9 object-cover"
          onError={() => setBrokenSrc(avatarUrl)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white/80">
          {initial}
        </div>
      )}
    </div>
  );
}

export function DrawerMenuSections({
  drawerProfile,
  dealerApplications: _dealerApplications,
  loggedIn,
  sessionEmail = null,
  unreadMessageCount,
  hasListings = false,
  onNavigate,
  onClose,
  mode = "all",
}: {
  drawerProfile: { displayName: string; avatarUrl: string | null } | null;
  dealerApplications: BayiApplicationMenuRow[];
  loggedIn: boolean;
  sessionEmail?: string | null;
  unreadMessageCount: number;
  hasListings?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
  /** `header` = yalnız üst banner, `links` = kişisel menü linkleri, `all` = ikisi */
  mode?: "all" | "header" | "links";
}) {
  const displayName =
    drawerProfile?.displayName ??
    (sessionEmail
      ? sessionEmail.split("@")[0]?.trim() || sessionEmail
      : "");

  const showHeader = mode === "all" || mode === "header";
  const showLinks = (mode === "all" || mode === "links") && loggedIn;

  return (
    <>
      {showHeader ? (
        <DrawerPersonalHeader
          loggedIn={loggedIn}
          displayName={displayName}
          avatarUrl={drawerProfile?.avatarUrl ?? null}
          onNavigate={onNavigate}
          onClose={onClose}
        />
      ) : null}

      {showLinks ? (
        <div className="space-y-1.5 px-1.5 pt-2">
          <Link href="/ilan-ver" onClick={() => onNavigate?.()} className={rowClass}>
            <IconPlusGreen />
            <span>İlan ver</span>
          </Link>

          {hasListings ? (
            <Link
              href="/ilan-one-cikar"
              onClick={() => onNavigate?.()}
              className={rowClass}
            >
              <IconBoostAmber />
              <span>İlan öne çıkar</span>
            </Link>
          ) : null}

          <Link href="/favoriler" onClick={() => onNavigate?.()} className={rowClass}>
            <IconHeartRed />
            <span>Favoriler</span>
          </Link>

          <Link
            href="/mesajlar"
            onClick={() => onNavigate?.()}
            className={`${rowClass} relative`}
          >
            <IconMessageBlue />
            <span className="flex min-w-0 flex-1 items-center gap-2">
              Mesajlarım
              <MessageUnreadBadge
                count={unreadMessageCount}
                className="min-h-[1.1rem] min-w-[1.1rem] text-[10px]"
              />
            </span>
          </Link>
        </div>
      ) : null}
    </>
  );
}
