"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useRef, useState, useTransition } from "react";
import type { CategoryRow } from "@/lib/listings-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getClientAuthUser } from "@/lib/supabase/auth-client";
import { HamburgerButton, LeftNavDrawer } from "@/components/LeftNavDrawer";
import { MessageUnreadBadge } from "@/components/MessageUnreadBadge";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import { useUserHasListings } from "@/hooks/useUserHasListings";
import { listingNumberFromSearchQuery } from "@/lib/listing-number-search";
import type { BayiApplicationMenuRow } from "@/lib/bayi-applications";

const linkClass =
  "text-zinc-900 hover:underline decoration-zinc-900/40 font-semibold";

const navSearchFormClass =
  "flex min-w-0 w-full";
const navSearchInputClass =
  "w-full min-w-0 rounded-md border border-zinc-500/50 bg-white px-2.5 py-1.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-500 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/25";

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 0 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}

type HeaderNotification = {
  id: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

function NavSearchFallback({ id }: { id: string }) {
  return (
    <form role="search" className={navSearchFormClass}>
      <label htmlFor={id} className="sr-only">
        İlan ara
      </label>
      <input
        id={id}
        type="search"
        name="q"
        placeholder="Ara…"
        disabled
        className={`${navSearchInputClass} opacity-70`}
      />
    </form>
  );
}

function NavSearchForm({ id = "site-nav-search" }: { id?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const defaultQuery = pathname === "/" ? (searchParams.get("q") ?? "") : "";

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = String(fd.get("q") ?? "").trim();
    const listingNo = listingNumberFromSearchQuery(raw);
    if (listingNo) {
      router.push(`/ilan/${listingNo}`);
      return;
    }
    const p = new URLSearchParams();
    if (raw) p.set("q", raw);
    const href = p.toString() ? `/?${p}` : "/";
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <form
      role="search"
      className={navSearchFormClass}
      onSubmit={handleSubmit}
    >
      <label htmlFor={id} className="sr-only">
        İlan ara
      </label>
      <input
        id={id}
        type="search"
        name="q"
        key={`${id}-${defaultQuery}`}
        defaultValue={defaultQuery}
        placeholder="Ara…"
        autoComplete="off"
        enterKeyHint="search"
        disabled={pending}
        className={`${navSearchInputClass}${pending ? " opacity-70" : ""}`}
      />
    </form>
  );
}

function NavProfileAvatar({
  displayName,
  avatarUrl,
  title,
}: {
  displayName: string;
  avatarUrl: string | null;
  title?: string;
}) {
  const initial =
    displayName.trim().slice(0, 1).toLocaleUpperCase("tr") || "?";

  return (
    <Link
      href="/profil"
      className="relative inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-zinc-900/15 transition hover:ring-zinc-900/35"
      title={title ?? displayName}
      aria-label="Hesabım"
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          width={36}
          height={36}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-zinc-900 text-sm font-bold text-[#ffcc00]">
          {initial}
        </span>
      )}
    </Link>
  );
}

export function SiteHeaderClient({
  categories,
  dealerApplications,
  drawerProfile,
  email,
  hasEnv,
  hasListings: serverHasListings,
}: {
  categories: CategoryRow[];
  dealerApplications: BayiApplicationMenuRow[];
  drawerProfile: { displayName: string; avatarUrl: string | null } | null;
  email: string | null;
  hasEnv: boolean;
  hasListings: boolean;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [sessionEmail, setSessionEmail] = useState<string | null>(email);

  useEffect(() => {
    setSessionEmail(email);
  }, [email]);

  useEffect(() => {
    if (!hasEnv) return;
    const supabase = createSupabaseBrowserClient();
    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSessionEmail(session?.user?.email ?? null);
      })
      .catch(() => {
        setSessionEmail(null);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, [hasEnv]);

  useEffect(() => {
    setDrawerOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        setHeaderVisible(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setHeaderVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setHeaderVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const offset = headerVisible ? "5.5rem" : "0px";
    document.documentElement.style.setProperty("--header-offset", offset);
  }, [headerVisible]);

  const loggedIn = !!sessionEmail;
  const hasListings = useUserHasListings(hasEnv, loggedIn, serverHasListings);
  const unreadMessageCount = useUnreadMessageCount(hasEnv, loggedIn);
  const unreadNotificationCount = useUnreadNotificationCount(hasEnv, loggedIn);

  useEffect(() => {
    if (!notifOpen) return;
    function onDoc(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [notifOpen]);

  async function loadNotifications() {
    if (!hasEnv || !loggedIn) return;
    setNotifLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const user = await getClientAuthUser(supabase);
      if (!user) return;
      const { data } = await supabase
        .from("user_notifications")
        .select("id,title,body,read_at,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);
      setNotifications((data ?? []) as HeaderNotification[]);
    } finally {
      setNotifLoading(false);
    }
  }

  useEffect(() => {
    if (notifOpen) void loadNotifications();
    // unread değiştiğinde panel açıksa tazele
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifOpen, unreadNotificationCount]);

  async function markOne(notificationId: string) {
    const res = await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    });
    if (!res.ok) return;
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, read_at: new Date().toISOString() }
          : n
      )
    );
  }

  async function markAll() {
    const res = await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    if (!res.ok) return;
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: now })));
  }

  return (
    <>
      <LeftNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        categories={categories}
        dealerApplications={dealerApplications}
        drawerProfile={drawerProfile}
        sessionEmail={sessionEmail}
        unreadMessageCount={unreadMessageCount}
        hasListings={hasListings}
      />

      <header
        className={`sticky top-0 z-40 border-b border-amber-400/80 bg-[#ffcc00] shadow-sm transition-transform duration-300 ${
          headerVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-[1400px] px-2 py-2 sm:px-4 sm:py-2.5 md:px-6">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(12rem,1fr)_auto_minmax(13rem,1fr)] sm:gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <HamburgerButton
              open={drawerOpen}
              onClick={() => setDrawerOpen((o) => !o)}
              className="text-zinc-900 hover:bg-black/10 focus:ring-zinc-900/30"
            />
            <div className="hidden min-w-0 flex-1 sm:block sm:max-w-[280px] md:max-w-[340px] lg:max-w-[420px]">
              <Suspense fallback={<NavSearchFallback id="site-nav-search-desktop" />}>
                <NavSearchForm id="site-nav-search-desktop" />
              </Suspense>
            </div>
          </div>

          <Link
            href="/"
            className="justify-self-center px-1 py-0.5 text-center"
            onClick={() => setDrawerOpen(false)}
          >
            <span className="whitespace-nowrap text-lg font-extrabold tracking-tight text-zinc-900 sm:text-xl md:text-2xl">
              Oto Pazarı
            </span>
          </Link>

          <nav className="flex min-w-0 items-center justify-end gap-x-1.5 gap-y-1 text-sm sm:gap-x-2 md:gap-x-2 lg:gap-x-3">
            {hasEnv ? (
              <>
                <Link
                  href="/ilan-ver"
                  className="hidden whitespace-nowrap rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-extrabold text-[#ffcc00] hover:bg-zinc-800 md:inline-flex lg:px-3 lg:py-2 lg:text-sm"
                >
                  İlan ver
                </Link>
                {hasListings ? (
                  <Link
                    href="/ilan-one-cikar"
                    className="hidden whitespace-nowrap rounded-md border border-zinc-900/25 bg-white/90 px-2.5 py-1.5 text-xs font-bold text-zinc-900 hover:bg-white md:inline-flex lg:px-3 lg:py-2 lg:text-sm"
                  >
                    Öne çıkar
                  </Link>
                ) : null}
                {loggedIn ? (
                  <>
                    <Link
                      href="/favoriler"
                      className={`${linkClass} hidden whitespace-nowrap xl:inline-flex`}
                    >
                      Favoriler
                    </Link>
                    <Link
                      href="/mesajlar"
                      className={`${linkClass} hidden whitespace-nowrap lg:inline-flex lg:items-center lg:gap-1.5`}
                    >
                      Mesajlar
                      <MessageUnreadBadge count={unreadMessageCount} />
                    </Link>
                    <div className="relative shrink-0" ref={notifRef}>
                      <button
                        type="button"
                        onClick={() => setNotifOpen((o) => !o)}
                        className="relative inline-flex items-center justify-center rounded-md p-2 text-zinc-900 hover:bg-black/10"
                        aria-label="Bildirimler"
                        aria-expanded={notifOpen}
                      >
                        <BellIcon />
                        <MessageUnreadBadge
                          count={unreadNotificationCount}
                          className="absolute -right-1 -top-1 min-h-[1rem] min-w-[1rem] px-0.5 text-[9px]"
                        />
                      </button>
                      {notifOpen ? (
                        <div className="absolute right-0 top-[calc(100%+8px)] z-[80] w-[min(92vw,22rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
                          <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
                            <p className="text-sm font-semibold text-zinc-900">
                              Bildirimler
                            </p>
                            {notifications.some((n) => n.read_at == null) ? (
                              <button
                                type="button"
                                onClick={() => void markAll()}
                                className="text-[11px] font-medium text-zinc-700 underline hover:text-zinc-900"
                              >
                                Tümünü oku
                              </button>
                            ) : null}
                          </div>
                          <div className="max-h-80 overflow-y-auto p-2">
                            {notifLoading ? (
                              <p className="px-2 py-6 text-center text-xs text-zinc-500">
                                Yükleniyor…
                              </p>
                            ) : notifications.length === 0 ? (
                              <p className="px-2 py-6 text-center text-xs text-zinc-500">
                                Bildirim yok.
                              </p>
                            ) : (
                              <ul className="space-y-1.5">
                                {notifications.map((n) => {
                                  const unread = n.read_at == null;
                                  return (
                                    <li
                                      key={n.id}
                                      className={`rounded-lg border px-2.5 py-2 ${
                                        unread
                                          ? "border-amber-200 bg-amber-50/70"
                                          : "border-zinc-200 bg-white"
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <p className="line-clamp-2 text-xs font-semibold text-zinc-900">
                                          {n.title}
                                        </p>
                                        {unread ? (
                                          <button
                                            type="button"
                                            onClick={() => void markOne(n.id)}
                                            className="shrink-0 rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 hover:bg-zinc-50"
                                          >
                                            Okundu
                                          </button>
                                        ) : null}
                                      </div>
                                      {n.body ? (
                                        <p className="mt-1 line-clamp-2 text-[11px] text-zinc-700">
                                          {n.body}
                                        </p>
                                      ) : null}
                                      <p className="mt-1 text-[10px] text-zinc-500">
                                        {new Date(n.created_at).toLocaleString(
                                          "tr-TR",
                                          {
                                            day: "numeric",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          }
                                        )}
                                      </p>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                          <div className="border-t border-zinc-200 px-3 py-2 text-right">
                            <Link
                              href="/profil/bildirimler"
                              onClick={() => setNotifOpen(false)}
                              className="text-xs font-medium text-zinc-800 underline hover:text-zinc-950"
                            >
                              Tüm bildirimler
                            </Link>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <NavProfileAvatar
                      displayName={
                        drawerProfile?.displayName ??
                        sessionEmail?.split("@")[0] ??
                        "Hesabım"
                      }
                      avatarUrl={drawerProfile?.avatarUrl ?? null}
                      title={sessionEmail ?? undefined}
                    />
                  </>
                ) : (
                  <>
                    <Link
                      href="/giris"
                      className={`${linkClass} whitespace-nowrap text-xs sm:text-sm`}
                    >
                      Giriş
                    </Link>
                    <Link
                      href="/kayit"
                      className="whitespace-nowrap rounded-md border border-zinc-900/25 bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-[#ffcc00] hover:bg-zinc-800 sm:text-sm"
                    >
                      Kayıt
                    </Link>
                  </>
                )}
              </>
            ) : null}
          </nav>
          </div>
          <div className="mt-2 sm:hidden">
            <Suspense fallback={<NavSearchFallback id="site-nav-search-mobile" />}>
              <NavSearchForm id="site-nav-search-mobile" />
            </Suspense>
          </div>
        </div>
      </header>

      <MobileBottomNav
        loggedIn={loggedIn}
        hasEnv={hasEnv}
        unreadMessageCount={unreadMessageCount}
      />
    </>
  );
}
