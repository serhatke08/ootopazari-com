import type { User } from "@supabase/supabase-js";

/** Küçük harf + rakam + _ — profil handle */
export function sanitizeUsernameCandidate(raw: string | null | undefined): string | null {
  const s = (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  if (s.length < 3) return null;
  if (s.length > 30) return s.slice(0, 30);
  return s;
}

export function usernameFromAuthMetadata(user: User): string | null {
  const m = user.user_metadata as Record<string, unknown> | undefined;
  if (!m) return null;
  return sanitizeUsernameCandidate(
    typeof m.username === "string" ? m.username : null
  );
}

export function usernameFromEmail(user: User): string | null {
  const email = user.email?.trim().toLowerCase() ?? "";
  if (!email.includes("@")) return null;
  const local = email.split("@")[0] ?? "";
  return sanitizeUsernameCandidate(local.replace(/[.+]/g, "_"));
}

/**
 * Profilde username yoksa metadata / e-posta ile doldurulacak aday.
 * Çağıran taraf müsaitlik kontrolü yapmalı.
 */
export function resolveUsernameCandidate(
  user: User,
  profileUsername: string | null | undefined
): string | null {
  const fromProfile = sanitizeUsernameCandidate(profileUsername);
  if (fromProfile) return fromProfile;
  return usernameFromAuthMetadata(user) ?? usernameFromEmail(user);
}
