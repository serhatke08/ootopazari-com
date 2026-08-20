import type { Metadata } from "next";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ListingNavSkeletonGate } from "@/components/ListingNavSkeletonGate";
import { SiteHeaderFallback, SiteMainShell } from "@/components/SiteListingChrome";
import { AppNavigationMemory } from "@/components/AppNavigationMemory";
import { SiteSearchProvider } from "@/components/SiteSearchProvider";
import { tryGetSupabaseEnv } from "@/lib/env";
import { getSiteOrigin } from "@/lib/site-url";
import {
  SITE_DISPLAY_NAME,
  SITE_HOME_DESCRIPTION,
  SITE_HOME_OG_DESCRIPTION,
  SITE_HOME_TITLE,
  SITE_HOME_TWITTER_DESCRIPTION,
  SITE_KEYWORDS,
} from "@/lib/seo-brand";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ADSENSE_CLIENT_ID } from "@/lib/adsense";
import { AppDownloadPromoPopup } from "@/components/AppDownloadPromoPopup";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  applicationName: SITE_DISPLAY_NAME,
  title: {
    default: SITE_HOME_TITLE,
    template: `%s | ${SITE_DISPLAY_NAME}`,
  },
  description: SITE_HOME_DESCRIPTION,
  keywords: [...SITE_KEYWORDS],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/",
    siteName: SITE_DISPLAY_NAME,
    title: SITE_HOME_TITLE,
    description: SITE_HOME_OG_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_HOME_TITLE,
    description: SITE_HOME_TWITTER_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
  appleWebApp: {
    title: SITE_DISPLAY_NAME,
    capable: true,
  },
  icons: {
    icon: [
      { url: "/menu/pazar.png?v=20260413", sizes: "32x32", type: "image/png" },
      { url: "/menu/pazar.png?v=20260413", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/menu/pazar.png?v=20260413",
    apple: "/menu/pazar.png?v=20260413",
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let footerLoggedIn = false;
  let footerHasListings = false;
  if (tryGetSupabaseEnv()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      footerLoggedIn = !!user;
      if (user) {
        const { count } = await supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        footerHasListings = (count ?? 0) > 0;
      }
    } catch {
      footerLoggedIn = false;
      footerHasListings = false;
    }
  }

  return (
    <html lang="tr" className="h-full antialiased">
      <head>
        <link
          rel="icon"
          href="/menu/pazar.png?v=20260413"
          type="image/png"
          sizes="32x32"
        />
        <link
          rel="shortcut icon"
          href="/menu/pazar.png?v=20260413"
          type="image/png"
        />
        <link
          rel="apple-touch-icon"
          href="/menu/pazar.png?v=20260413"
        />
      </head>
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
        <div
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}" crossorigin="anonymous"></script>`,
          }}
        />
        <SiteSearchProvider>
          <Suspense fallback={null}>
            <AppNavigationMemory />
          </Suspense>
          <Suspense fallback={<SiteHeaderFallback />}>
            <SiteHeader />
          </Suspense>
          <SiteMainShell>
            <main className="flex min-h-0 flex-1 flex-col bg-zinc-50">{children}</main>
            <SiteFooter loggedIn={footerLoggedIn} hasListings={footerHasListings} />
          </SiteMainShell>
          <ListingNavSkeletonGate />
          <AppDownloadPromoPopup />
        </SiteSearchProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
