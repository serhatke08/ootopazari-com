import type { NextConfig } from "next";

function supabaseImageHostname(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

const supabaseHost = supabaseImageHostname();

/** Google ile girişte `user_metadata.avatar_url` (lh*.googleusercontent.com). */
const GOOGLE_AVATAR_HOSTS = [
  "lh3.googleusercontent.com",
  "lh4.googleusercontent.com",
  "lh5.googleusercontent.com",
  "lh6.googleusercontent.com",
] as const;

const SUPABASE_FALLBACK_HOSTS = [
  "**.supabase.co",
  "**.supabase.in",
] as const;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...[...new Set([supabaseHost, ...SUPABASE_FALLBACK_HOSTS].filter(Boolean) as string[])].flatMap(
        (hostname) => [
          {
            protocol: "https" as const,
            hostname,
            pathname: "/storage/v1/object/public/**",
          },
          {
            protocol: "https" as const,
            hostname,
            pathname: "/storage/v1/object/sign/**",
          },
        ]
      ),
      ...GOOGLE_AVATAR_HOSTS.map((hostname) => ({
        protocol: "https" as const,
        hostname,
        pathname: "/**",
      })),
    ],
  },
};

export default nextConfig;
