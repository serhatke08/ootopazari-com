import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { tryGetSupabaseEnv } from "@/lib/env";
import { getSiteOrigin } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  applicationName: "Oto Pazarı",
  title: {
    default: "Oto Pazarı — İkinci El ve Sıfır Araç İlanları",
    template: "%s | Oto Pazarı",
  },
  description:
    "Oto Pazarı — Türkiye'nin ikinci el araba ve sıfır otomobil ilan platformu. Ücretsiz ilan ver, filtrele, favorile ve satıcıyla mesajlaş.",
  keywords: [
    "oto pazarı",
    "oto pazarı ilanları",
    "otomobil pazarı",
    "araba ilanları",
    "ikinci el araba",
    "ikinci el otomobil",
    "sıfır araç",
    "otomobil",
    "araba sat",
    "araba al",
    "galeri",
    "ekspertiz",
    "ücretsiz ilan ver",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/",
    siteName: "Oto Pazarı",
    title: "Oto Pazarı — İkinci El ve Sıfır Araç İlanları",
    description:
      "Oto Pazarı ile Türkiye genelinde ikinci el ve sıfır otomobil ilanlarını keşfedin. Ücretsiz ilan ver, filtrele ve mesajlaş.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Oto Pazarı — İkinci El ve Sıfır Araç İlanları",
    description:
      "Türkiye'nin oto pazarı — ikinci el araba ve sıfır otomobil ilanları.",
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
  if (tryGetSupabaseEnv()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      footerLoggedIn = !!user;
    } catch {
      footerLoggedIn = false;
    }
  }

  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
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
        <Suspense
          fallback={
            <header className="h-14 border-b border-amber-400/80 bg-[#ffcc00]" />
          }
        >
          <SiteHeader />
        </Suspense>
        <div className="layout-with-mobile-nav flex flex-1 flex-col">
          <main className="flex flex-1 flex-col bg-zinc-50">{children}</main>
          <SiteFooter loggedIn={footerLoggedIn} />
        </div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
