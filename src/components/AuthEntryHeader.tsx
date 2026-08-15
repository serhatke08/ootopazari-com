"use client";

import Image from "next/image";
import { GoogleIcon } from "@/components/GoogleIcon";
import { appStoreUrl, playStoreUrl } from "@/lib/app-stores";

const tileClass =
  "flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-zinc-900/20 disabled:opacity-60";

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M16.37 12.64c.03-2.23 1.82-3.3 1.9-3.35-1.04-1.52-2.65-1.73-3.22-1.75-1.37-.14-2.68.8-3.37.8-.7 0-1.77-.78-2.92-.76-1.5.02-2.89.87-3.66 2.21-1.56 2.71-.4 6.72 1.12 8.92.75 1.08 1.64 2.28 2.81 2.24 1.13-.05 1.56-.73 2.92-.73s1.75.73 2.94.71c1.22-.02 1.99-1.1 2.73-2.18.86-1.25 1.21-2.47 1.23-2.53-.03-.01-2.36-.9-2.38-3.58zM14.7 6.4c.62-.75 1.04-1.79.92-2.83-.89.04-1.97.6-2.61 1.35-.57.66-1.08 1.73-.94 2.74 1 .08 2.02-.51 2.63-1.26z" />
    </svg>
  );
}

export function AuthEntryHeader({
  subtitle,
  onGoogle,
  googleBusy = false,
  googleDisabled = false,
}: {
  subtitle: string;
  onGoogle: () => void;
  googleBusy?: boolean;
  googleDisabled?: boolean;
}) {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <div className="mb-4 flex h-[5.5rem] w-[5.5rem] items-center justify-center overflow-hidden rounded-2xl border-2 border-zinc-900/20 bg-[#ffcc00] shadow-sm">
        <Image
          src="/menu/pazar.png"
          alt="Oto Pazarı"
          width={88}
          height={88}
          className="h-full w-full object-cover"
          priority
        />
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">
        Oto Pazarı
      </h1>
      <p className="mt-1 text-sm font-medium text-zinc-500">{subtitle}</p>
      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onGoogle}
          disabled={googleDisabled || googleBusy}
          className={tileClass}
          aria-label={googleBusy ? "Google yönlendiriliyor" : "Google ile giriş"}
          title="Google ile giriş"
        >
          <GoogleIcon className="h-6 w-6" />
        </button>
        <a
          href={appStoreUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className={tileClass}
          aria-label="App Store’da Oto Pazarı"
          title="iOS uygulaması"
        >
          <AppleIcon className="h-6 w-6 text-zinc-900" />
        </a>
        <a
          href={playStoreUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className={tileClass}
          aria-label="Google Play’de Oto Pazarı"
          title="Google Play"
        >
          <Image
            src="/menu/google-play.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
        </a>
      </div>
    </div>
  );
}
