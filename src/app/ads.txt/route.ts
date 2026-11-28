import { adsTxtBody } from "@/lib/ads-txt";

export const dynamic = "force-static";

const HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
  "X-Content-Type-Options": "nosniff",
};

export function GET() {
  return new Response(adsTxtBody(), { status: 200, headers: HEADERS });
}

export function HEAD() {
  return new Response(null, { status: 200, headers: HEADERS });
}
