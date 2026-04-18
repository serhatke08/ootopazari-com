export type SupabasePublicEnv = { url: string; anonKey: string };

/** `https://xxxx.supabase.co` → `xxxx` */
function projectRefFromSupabaseUrl(url: string): string | null {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    const m = /^([a-z0-9]+)\.supabase\.co$/i.exec(host);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** Anon JWT payload `ref` alanı (proje kimliği). */
function projectRefFromAnonKey(anonKey: string): string | null {
  const parts = anonKey.trim().split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad =
      base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
    const json = atob(base64 + pad);
    const payload = JSON.parse(json) as { ref?: string };
    return typeof payload.ref === "string" ? payload.ref : null;
  } catch {
    return null;
  }
}

function warnDevMismatch(url: string, anonKey: string): void {
  if (process.env.NODE_ENV !== "development") return;
  const urlRef = projectRefFromSupabaseUrl(url);
  const keyRef = projectRefFromAnonKey(anonKey);
  if (!keyRef && anonKey.length > 0) {
    console.warn(
      "[Oto] NEXT_PUBLIC_SUPABASE_ANON_KEY geçerli bir JWT gibi görünmüyor (3 parça nokta ile ayrılmalı). Supabase Dashboard → Settings → API → anon public anahtarını yeniden kopyalayın."
    );
  }
  if (urlRef && keyRef && urlRef !== keyRef) {
    console.warn(
      `[Oto] URL projesi (${urlRef}) ile anon key içindeki ref (${keyRef}) farklı — bu genelde "Invalid API key" hatasına yol açar. Aynı projeden hem URL hem anon key kopyalayın.`
    );
  }
}

export function tryGetSupabaseEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  warnDevMismatch(url, anonKey);
  return { url, anonKey };
}

export function getSupabaseEnv(): SupabasePublicEnv {
  const env = tryGetSupabaseEnv();
  if (!env) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }
  return env;
}
