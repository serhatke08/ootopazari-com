import type { ReactNode } from "react";

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className ?? "h-3.5 w-3.5"}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function HeartSmallIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className ?? "h-3.5 w-3.5"}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}

type Props = {
  views: number;
  favorites: number;
  /** kart altı (border) veya detay (inline) */
  variant?: "card" | "inline";
  /** Kartta sağa hizalı (örn. şehir) */
  rightSlot?: ReactNode;
};

export function StatsBadges({
  views,
  favorites,
  variant = "card",
  rightSlot,
}: Props) {
  if (variant === "inline") {
    return (
      <span className="inline-flex flex-wrap items-center gap-4 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <EyeIcon className="h-4 w-4 text-zinc-400" />
          {views}
        </span>
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <HeartSmallIcon className="h-4 w-4 text-zinc-400" />
          {favorites}
        </span>
      </span>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-zinc-100 pt-2 text-[11px] text-zinc-500 max-sm:mt-1 max-sm:gap-x-2.5 max-sm:pt-1.5 max-sm:text-[10px]">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="inline-flex items-center gap-1 tabular-nums" title="Görüntülenme">
          <EyeIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400 max-sm:h-3 max-sm:w-3" />
          {views}
        </span>
        <span className="inline-flex items-center gap-1 tabular-nums" title="Favori">
          <HeartSmallIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400 max-sm:h-3 max-sm:w-3" />
          {favorites}
        </span>
      </div>
      {rightSlot ? (
        <span className="max-w-[min(12rem,48%)] shrink-0 truncate text-right font-medium text-zinc-600">
          {rightSlot}
        </span>
      ) : null}
    </div>
  );
}
