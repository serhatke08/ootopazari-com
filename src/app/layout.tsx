import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
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
    default: "Oto Pazarı | İkinci El ve Sıfır Araç İlanları",
    template: "%s | Oto Pazarı",
  },
  description:
    "Türkiye genelinde ikinci el ve sıfır araç ilanları. Otomobil, galeri, ekspertiz, parça ve kiralama kategorilerinde güvenilir ilanları keşfedin.",
  keywords: [
    "oto pazarı",
    "araba ilanları",
    "ikinci el araba",
    "sıfır araç",
    "otomobil",
    "galeri",
    "ekspertiz",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/",
    siteName: "Oto Pazarı",
    title: "Oto Pazarı | İkinci El ve Sıfır Araç İlanları",
    description:
      "Türkiye genelinde ikinci el ve sıfır araç ilanları. Güvenilir satıcılardan ilanları filtreleyin, favorileyin ve mesajlaşın.",
    images: [
      {
        url: "/menu/pazar.png?v=20260413",
        width: 512,
        height: 512,
        alt: "Oto Pazarı",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Oto Pazarı | İkinci El ve Sıfır Araç İlanları",
    description:
      "Türkiye genelinde ikinci el ve sıfır araç ilanlarını keşfedin.",
    images: ["/menu/pazar.png?v=20260413"],
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
      <body className="flex min-h-full flex-col bg-white text-zinc-900">
        <Suspense
          fallback={
            <header className="h-14 border-b border-amber-400/80 bg-[#ffcc00]" />
          }
        >
          <SiteHeader />
        </Suspense>
        <div className="flex flex-1 flex-col pb-[calc(4.35rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          <main className="flex flex-1 flex-col bg-white">{children}</main>
          <SiteFooter loggedIn={footerLoggedIn} />
        </div>
      </body>
    </html>
  );
}
