import { redirect } from "next/navigation";

/** Eski /ilanlar bağlantıları ana sayfaya taşındı; sorgu korunur. */
export default async function IlanlarLegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val != null && val !== "") p.set(k, val);
  }
  const qs = p.toString();
  redirect(qs ? `/?${qs}` : "/");
}
