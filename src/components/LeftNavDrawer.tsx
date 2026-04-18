"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import type { CategoryRow } from "@/lib/listings-data";
import { DrawerMenuSections } from "@/components/DrawerMenuSections";
import { SidebarQuickLinks } from "@/components/SidebarQuickLinks";
import { QUICK_ACCESS_LINKS } from "@/lib/quick-access-links";
import { VehicleCascadeSidebar } from "@/components/VehicleCascadeSidebar";
import type { BayiApplicationMenuRow } from "@/lib/bayi-applications";

const DRAWER_QUICK_LINKS = QUICK_ACCESS_LINKS.filter(
  (x) => x.href !== "/?q=magaza"
);

function IconMenu({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function LeftNavDrawer({
  open,
  onClose,
  categories,
  dealerApplications,
  drawerProfile,
  sessionEmail = null,
  unreadMessageCount = 0,
}: {
  open: boolean;
  onClose: () => void;
  categories: CategoryRow[];
  dealerApplications: BayiApplicationMenuRow[];
  drawerProfile: { displayName: string; avatarUrl: string | null } | null;
  /** İstemci oturumu (SSR profili gecikmeli gelse bile menüde girişli gösterim). */
  sessionEmail?: string | null;
  unreadMessageCount?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /** Menü kapanınca cascade + select’ler sıfırlansın; mobilde açık picker kapanır */
  const [cascadeMountKey, setCascadeMountKey] = useState(0);
  const prevOpenRef = useRef<boolean | null>(null);
  useEffect(() => {
    const prev = prevOpenRef.current;
    if (prev === true && open === false) {
      setCascadeMountKey((k) => k + 1);
      const ae = document.activeElement;
      if (ae instanceof HTMLElement && ae.closest("#site-left-drawer")) {
        ae.blur();
      }
    }
    prevOpenRef.current = open;
  }, [open]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/45 transition-opacity duration-300 ease-out ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
        onClick={onClose}
      />

      <aside
        id="site-left-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Site menüsü"
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-[70] flex w-[min(100vw,380px)] max-w-full flex-col border-r border-amber-400/50 bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-amber-400/80 bg-[#ffcc00] px-3 py-3">
          <span className="text-sm font-black tracking-tight text-zinc-900">
            Menü
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-zinc-900 hover:bg-black/10"
            aria-label="Menüyü kapat"
          >
            <IconClose className="h-6 w-6" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
          <div className="space-y-4">
            <DrawerMenuSections
              drawerProfile={drawerProfile}
              dealerApplications={dealerApplications}
              sessionEmail={sessionEmail}
              unreadMessageCount={unreadMessageCount}
              onNavigate={onClose}
            />
            <div className="border-t border-zinc-200 pt-1">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Kategoriler
              </p>
              <Suspense
                fallback={
                  <div
                    className="min-h-[12rem] rounded-lg border border-zinc-200 bg-zinc-50/90"
                    aria-hidden
                  />
                }
              >
                <VehicleCascadeSidebar
                  key={cascadeMountKey}
                  categories={categories}
                  onNavigate={onClose}
                />
              </Suspense>
            </div>
            <div className="border-t border-zinc-200 pt-3">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Kısayollar
              </p>
              <SidebarQuickLinks
                onNavigate={onClose}
                compact
                items={DRAWER_QUICK_LINKS}
              />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export function HamburgerButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-zinc-900 hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-zinc-900/30"
      aria-expanded={open}
      aria-controls="site-left-drawer"
      aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
    >
      {open ? (
        <IconClose className="h-6 w-6" />
      ) : (
        <IconMenu className="h-6 w-6" />
      )}
    </button>
  );
}
