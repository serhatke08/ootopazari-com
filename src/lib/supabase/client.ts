import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/env";

const safeFetch: typeof fetch = (...args) =>
  fetch(...args).catch(() =>
    Response.json(
      {
        error: "network_error",
        error_description: "Supabase bağlantısı kurulamadı.",
      },
      { status: 503 }
    )
  );

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey, {
    global: { fetch: safeFetch },
  });
}
