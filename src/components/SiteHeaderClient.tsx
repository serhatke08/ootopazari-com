"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { CategoryRow } from "@/lib/listings-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { HamburgerButton, LeftNavDrawer } from "@/components/LeftNavDrawer";
import { MessageUnreadBadge } from "@/components/MessageUnreadBadge";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import { listingNumberFromSearchQuery } from "@/lib/listing-number-search";
import type { BayiApplicationMenuRow } from "@/lib/bayi-applications";

const linkClass =
  "text-zinc-900 hover:underline decoration-zinc-900/40 font-medium";

const navSearchFormClass =
  "flex min-w-0 flex-1 max-w-[min(100%,300px)] sm:max-w-[300px] md:max-w-[340px]";
const navSearchInputClass =
  "w-full min-w-0 rounded-md border border-zinc-500/50 bg-white px-2.5 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-500 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/25 sm:px-3 sm:py-1.5";

function dealerBorderColor(label: string): string {
  const key = label.trim().toLocaleLowerCase("tr");
  if (key === "ekspertiz") return "#a91414";
  if (key === "galeri") return "#5e17eb";
  if (key === "parça") return "#2e6417";
  if (key === "kiralama") return "#0081cc";
  if (key === "bayilikler" || key === "bayilik" || key === "pazar") return "#111111";
  return "#f59e0b";
}

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

function NavSearchForm() {
  const router = useRouter();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    const raw = String(fd.get("q") ?? "").trim();
    const listingNo = listingNumberFromSearchQuery(raw);
    if (listingNo) {
      e.preventDefault();
      router.push(`/ilan/${listingNo}`);
    }
  }

  return (
    <form
      action="/"
      method="get"
      role="search"
      className={navSearchFormClass}
      onSubmit={handleSubmit}
    >
      <label htmlFor="site-nav-search" className="sr-only">
        İlan ara
      </label>
      <input
        id="site-nav-search"
        type="search"
        name="q"
        placeholder="Ara…"
        autoComplete="off"
        enterKeyHint="search"
        className={navSearchInputClass}
      />
    </form>
  );
}

export function SiteHeaderClient({
  categories,
  dealerApplications,
  dealerStories,
  drawerProfile,
  email,
  hasEnv,
}: {
  categories: CategoryRow[];
  dealerApplications: BayiApplicationMenuRow[];
  dealerStories: Array<{
    id: string;
    displayName: string;
    imageUrl: string | null;
    href: string;
  }>;
  drawerProfile: { displayName: string; avatarUrl: string | null } | null;
  email: string | null;
  hasEnv: boolean;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
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

  const loggedIn = !!sessionEmail;
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
      let user: { id: string } | null = null;
      try {
        const authRes = await supabase.auth.getUser();
        user = authRes.data.user ? { id: authRes.data.user.id } : null;
      } catch {
        user = null;
      }
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
      />

      <header className="relative z-40 border-b border-amber-400/80 bg-[#ffcc00] shadow-sm">
        <div className="mx-auto flex max-w-[1400px] flex-nowrap items-center gap-2 px-2 py-2 sm:gap-3 sm:px-4 sm:py-2.5 md:px-6">
          <HamburgerButton
            open={drawerOpen}
            onClick={() => setDrawerOpen((o) => !o)}
          />

          <Link
            href="/"
            className="flex shrink-0 min-w-0 items-center py-0.5"
            onClick={() => setDrawerOpen(false)}
          >
            <span className="truncate text-lg font-extrabold tracking-tight text-zinc-900 sm:text-xl md:text-2xl">
              Oto Pazarı
            </span>
          </Link>

          <NavSearchForm />

          <nav className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 text-sm sm:gap-x-3">
            {hasEnv ? (
              <>
                <Link
                  href="/ilan-ver"
                  className={`${linkClass} hidden whitespace-nowrap md:inline font-semibold`}
                >
                  İlan ver
                </Link>
                {loggedIn ? (
                  <>
                    <Link
                      href="/mesajlar"
                      className={`${linkClass} hidden whitespace-nowrap text-sm font-semibold md:inline-flex md:items-center md:gap-1.5`}
                    >
                      Mesajlar
                      <MessageUnreadBadge count={unreadMessageCount} />
                    </Link>
                    <Link
                      href="/profil"
                      className={`${linkClass} hidden whitespace-nowrap text-sm font-semibold md:inline`}
                      title={sessionEmail ?? undefined}
                    >
                      Hesabım
                    </Link>
                    <div className="relative ml-0.5" ref={notifRef}>
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
                                        {new Date(n.created_at).toLocaleString("tr-TR", {
                                          day: "numeric",
                                          month: "short",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
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
                  </>
                ) : (
                  <>
                    <Link href="/giris" className={`${linkClass} whitespace-nowrap`}>
                      Giriş
                    </Link>
                    <Link
                      href="/kayit"
                      className="whitespace-nowrap rounded-md border border-zinc-900/25 bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-[#ffcc00] hover:bg-zinc-800 sm:px-3 sm:py-1.5 sm:text-sm"
                    >
                      Kayıt
                    </Link>
                  </>
                )}
              </>
            ) : null}
          </nav>
        </div>
      </header>
      {pathname === "/" && dealerStories.length > 0 ? (
        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-[1400px] px-2 pb-2 pt-3 sm:px-4 sm:pt-3.5 md:px-6">
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {dealerStories.map((d) => (
                <Link
                  key={d.id}
                  href={d.href}
                  className="group flex w-[4.35rem] shrink-0 flex-col items-center gap-1"
                >
                  <span
                    className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-[3px] bg-zinc-200 ring-offset-1 ring-offset-white transition group-hover:brightness-110"
                    style={{ borderColor: dealerBorderColor(d.displayName) }}
                  >
                    {d.imageUrl ? (
                      <Image
                        src={d.imageUrl}
                        alt=""
                        fill
                        className="h-full w-full scale-110 object-contain p-0.5"
                        sizes="48px"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-zinc-700">
                        {d.displayName.trim().slice(0, 1).toUpperCase() || "B"}
                      </span>
                    )}
                  </span>
                  <span className="w-full truncate text-center text-[10px] font-medium leading-tight text-zinc-700">
                    {d.displayName}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <MobileBottomNav
        loggedIn={loggedIn}
        hasEnv={hasEnv}
        unreadMessageCount={unreadMessageCount}
      />
    </>
  );
}
