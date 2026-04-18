/** Supabase Auth İngilizce hatalarını kullanıcıya anlaşılır Türkçe metne çevirir. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user already registered")
  ) {
    return "Bu e-posta adresiyle zaten kayıt var. Giriş yapmayı deneyin.";
  }
  if (m.includes("invalid login credentials")) {
    return "E-posta veya şifre hatalı.";
  }
  if (m.includes("email not confirmed")) {
    return "E-posta henüz onaylanmamış. Gelen kutunuzu kontrol edin.";
  }
  return message;
}
