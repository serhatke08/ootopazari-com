type Props = {
  client: string | null | undefined;
  className?: string;
};

function normalizeClient(raw: string | null | undefined): "ios" | "android" | "web" | null {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!v) return null;
  if (v === "ios" || v === "iphone" || v === "apple") return "ios";
  if (v === "android") return "android";
  if (v === "web" || v === "www" || v === "browser") return "web";
  return null;
}

function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M16.365 1.43c0 1.14-.93 2.59-2.07 2.59-.1 0-.2-.01-.3-.03-.06-1.18.95-2.52 2.1-2.74.1-.02.19-.03.27-.03v.21zm3.62 16.13c-.47 1.08-.7 1.56-1.3 2.52-.85 1.32-2.05 2.97-3.54 2.99-1.32.02-1.66-.86-3.46-.85-1.8.01-2.17.87-3.49.85-1.49-.02-2.63-1.5-3.48-2.82C2.6 17.7 1.4 13.4 2.92 10.35c.75-1.52 2.1-2.48 3.56-2.48 1.33 0 2.16.87 3.26.87 1.07 0 1.72-.87 3.26-.87 1.16 0 2.39.63 3.27 1.72-2.87 1.58-2.4 5.7.71 6.97z"
      />
    </svg>
  );
}

function AndroidGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M17.6 9.48l1.42-2.46a.5.5 0 10-.87-.5l-1.45 2.5A7.9 7.9 0 0012 8.2c-1.63 0-3.15.48-4.43 1.32L6.12 6.52a.5.5 0 10-.87.5l1.42 2.46A7.96 7.96 0 004 15.2v.8c0 .55.45 1 1 1h1v3.5a1.5 1.5 0 003 0V17h6v3.5a1.5 1.5 0 003 0V17h1c.55 0 1-.45 1-1v-.8a7.96 7.96 0 00-2.4-5.72zM9.25 13.5a1 1 0 110-2 1 1 0 010 2zm5.5 0a1 1 0 110-2 1 1 0 010 2z"
      />
    </svg>
  );
}

function GlobeGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12 2a10 10 0 100 20 10 10 0 000-20zm7.46 9h-3.1a15.4 15.4 0 00-1.2-5.1A8.03 8.03 0 0119.46 11zM12 4c.9 0 2.3 1.9 2.9 5H9.1C9.7 5.9 11.1 4 12 4zM4.54 13h3.1c.2 1.8.6 3.5 1.2 5.1A8.03 8.03 0 014.54 13zm3.1-2h-3.1a8.03 8.03 0 014.3-5.1A15.4 15.4 0 007.64 11zM12 20c-.9 0-2.3-1.9-2.9-5h5.8c-.6 3.1-2 5-2.9 5zm2.16-2H9.84a13.5 13.5 0 01-1.12-5h7.56a13.5 13.5 0 01-1.12 5zm1.96 0c.6-1.6 1-3.3 1.2-5.1h3.1a8.03 8.03 0 01-4.3 5.1z"
      />
    </svg>
  );
}

/** Admin ilan satırı — ios / android / web (dünya) ikonu. */
export function AdminListingPlatformIcon({ client, className }: Props) {
  const channel = normalizeClient(client);
  const wrap =
    className ??
    "inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-800 shadow-sm";

  if (channel === "ios") {
    return (
      <span className={wrap} title="iOS" aria-label="iOS">
        <AppleGlyph className="h-4 w-4" />
      </span>
    );
  }
  if (channel === "android") {
    return (
      <span className={`${wrap} text-emerald-600`} title="Android" aria-label="Android">
        <AndroidGlyph className="h-4 w-4" />
      </span>
    );
  }
  if (channel === "web") {
    return (
      <span className={`${wrap} text-blue-700`} title="Web" aria-label="Web">
        <GlobeGlyph className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span
      className={`${wrap} text-zinc-400`}
      title="Bilinmiyor"
      aria-label="Platform bilinmiyor"
    >
      <span className="text-[10px] font-bold">?</span>
    </span>
  );
}
