const CURRENT_KEY = "otopazari:nav:current";
const SAFE_BACK_KEY = "otopazari:nav:safeBack";
const OAUTH_PENDING_KEY = "otopazari:nav:oauthPending";
const OAUTH_TRAP_KEY = "otopazari:nav:oauthTrap";
const OAUTH_TRAP_PATH_KEY = "otopazari:nav:oauthTrapPath";

const AUTH_PATH = /^\/(giris|kayit|auth|hesap-tamamla)(\/|$|\?)/i;

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATH.test(pathname || "/");
}

export function rememberAppPath(fullPath: string) {
  if (typeof window === "undefined") return;
  if (!fullPath.startsWith("/") || isAuthPath(fullPath)) return;
  try {
    const current = sessionStorage.getItem(CURRENT_KEY);
    if (current && current !== fullPath) {
      sessionStorage.setItem(SAFE_BACK_KEY, current);
    }
    sessionStorage.setItem(CURRENT_KEY, fullPath);
  } catch {
    /* private mode */
  }
}

export function getSafeBackHref(fallback = "/"): string {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = sessionStorage.getItem(SAFE_BACK_KEY);
    if (
      stored &&
      stored.startsWith("/") &&
      !stored.startsWith("//") &&
      !isAuthPath(stored)
    ) {
      const here = `${window.location.pathname}${window.location.search}`;
      if (stored !== here) return stored;
    }
  } catch {
    /* private mode */
  }
  return fallback;
}

export function markOAuthRedirect() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(OAUTH_PENDING_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function consumeOAuthPending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(OAUTH_PENDING_KEY) !== "1") return false;
    sessionStorage.removeItem(OAUTH_PENDING_KEY);
    return true;
  } catch {
    return false;
  }
}

export function armOAuthBackTrap(pathname: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(OAUTH_TRAP_KEY, "1");
    sessionStorage.setItem(OAUTH_TRAP_PATH_KEY, pathname);
    window.history.pushState({ otopazariOauthTrap: true }, "", window.location.href);
  } catch {
    /* private mode */
  }
}

export function oauthTrapArmed(): boolean {
  try {
    return sessionStorage.getItem(OAUTH_TRAP_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearOAuthBackTrap() {
  try {
    sessionStorage.removeItem(OAUTH_TRAP_KEY);
    sessionStorage.removeItem(OAUTH_TRAP_PATH_KEY);
  } catch {
    /* private mode */
  }
}

export function shouldKeepOAuthTrap(pathname: string): boolean {
  try {
    if (sessionStorage.getItem(OAUTH_TRAP_KEY) !== "1") return false;
    const land = sessionStorage.getItem(OAUTH_TRAP_PATH_KEY);
    return !land || land === pathname;
  } catch {
    return false;
  }
}

export function isUnsafeHistoryReferrer(referrer: string): boolean {
  if (!referrer) return false;
  try {
    const url = new URL(referrer);
    if (url.origin !== window.location.origin) return true;
    return isAuthPath(url.pathname);
  } catch {
    return true;
  }
}
