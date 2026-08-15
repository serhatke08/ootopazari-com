"use client";

import Image from "next/image";
import Link from "next/link";
import { MessageUnreadBadge } from "@/components/MessageUnreadBadge";
import { DEALER_TYPE_META } from "@/lib/dealer-types";
import type { BayiApplicationMenuRow } from "@/lib/bayi-applications";

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

export function DrawerMenuSections({
  drawerProfile,
  dealerApplications,
  sessionEmail = null,
  unreadMessageCount,
  hasListings = false,
  onNavigate,
}: {
  drawerProfile: { displayName: string; avatarUrl: string | null } | null;
  dealerApplications: BayiApplicationMenuRow[];
  sessionEmail?: string | null;
  unreadMessageCount: number;
  hasListings?: boolean;
  onNavigate?: () => void;
}) {
  const loggedIn = !!drawerProfile || !!sessionEmail;
  const displayName =
    drawerProfile?.displayName ??
    (sessionEmail
      ? sessionEmail.split("@")[0]?.trim() || sessionEmail
      : "");

  return (
    <div className="space-y-1.5">
      {loggedIn ? (
        <Link
          href="/profil"
          onClick={() => onNavigate?.()}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/90 px-2 py-1.5 shadow-sm transition hover:border-amber-300 hover:bg-amber-50/40"
        >
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-200 ring-1 ring-white">
            {drawerProfile?.avatarUrl ? (
              <Image
                src={drawerProfile.avatarUrl}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-500">
                {displayName.trim().slice(0, 1).toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-zinc-900">
              {displayName}
            </p>
            <p className="text-[10px] text-zinc-500">Profilim</p>
          </div>
        </Link>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 px-2 py-2 text-center">
          <p className="text-[11px] text-zinc-600">Kişisel menü için giriş yapın.</p>
          <Link
            href="/giris"
            onClick={() => onNavigate?.()}
            className="mt-1 inline-block text-[11px] font-semibold text-emerald-800 underline-offset-2 hover:underline"
          >
            Giriş yap
          </Link>
        </div>
      )}

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
  );
}
