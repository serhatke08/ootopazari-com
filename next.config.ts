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

const host = supabaseImageHostname();

const nextConfig: NextConfig = {
  images: host
    ? {
        remotePatterns: [
          {
            protocol: "https",
            hostname: host,
            pathname: "/storage/v1/object/public/**",
          },
        ],
      }
    : undefined,
};

export default nextConfig;
