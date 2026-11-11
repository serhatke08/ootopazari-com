import type { HomeShortcutGlyph } from "@/lib/home-shortcuts";

export function HomeShortcutGlyphIcon({
  name,
  className = "h-6 w-6",
}: {
  name: HomeShortcutGlyph;
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "widgets":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="8" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" />
        </svg>
      );
    case "aksesuar":
      return (
        <svg {...common}>
          <path d="M12 4c-2 2-3 4.2-3 6.2a3 3 0 006 0C15 8.2 14 6 12 4z" />
          <path d="M8 14.5c.8 2.8 2 4.5 4 5.5 2-1 3.2-2.7 4-5.5" />
          <path d="M7 18h10" />
        </svg>
      );
    case "servis":
      return (
        <svg {...common}>
          <path d="M14.7 6.3a4 4 0 01-5.4 5.4L5 16l3 3 4.3-4.3a4 4 0 015.4-5.4l-2-2-1 1z" />
        </svg>
      );
    case "kaporta":
      return (
        <svg {...common}>
          <path d="M14 3l7 7-9 9H5v-7l9-9z" />
          <path d="M12 5l7 7" />
        </svg>
      );
    case "lastik":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 4v2.4M12 17.6V20M4 12h2.4M17.6 12H20" />
        </svg>
      );
    case "cekici":
      return (
        <svg {...common}>
          <path d="M3 17h13v3H3z" />
          <path d="M16 17l5-3v6l-5-3z" />
          <path d="M5 17V8h8l3 4" />
        </svg>
      );
    case "oto_elektrik":
      return (
        <svg {...common}>
          <path d="M13 2L4 14h7l-1 8 10-14h-7l0-6z" />
        </svg>
      );
    case "yikama":
      return (
        <svg {...common}>
          <path d="M3 17h18" />
          <path d="M5 17c0-4 3-7 7-7s7 3 7 7" />
          <path d="M8 8c.4-1.5 1.5-3 4-4 2.5 1 3.6 2.5 4 4" />
        </svg>
      );
    case "sigorta":
      return (
        <svg {...common}>
          <path d="M12 3l8 3.5v5.2c0 4.4-3.3 7.6-8 9.3-4.7-1.7-8-4.9-8-9.3V6.5L12 3z" />
          <path d="M9.5 12.2l1.8 1.8 3.7-3.8" />
        </svg>
      );
  }
}
