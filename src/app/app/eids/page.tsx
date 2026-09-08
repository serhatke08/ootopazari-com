import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EİDS doğrulama",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(
  v: string | string[] | undefined
): string {
  if (Array.isArray(v)) return v[0]?.trim() ?? "";
  return v?.trim() ?? "";
}

/**
 * Universal link hedefi (app açılmazsa tarayıcıda kalır).
 * App: EIDS_APP_UNIVERSAL_LINK_BASE=https://<domain>/app/eids
 */
export default async function AppEidsBridgePage({ searchParams }: Props) {
  const sp = await searchParams;
  const ok = one(sp.ok) === "1" || one(sp.eids) === "ok";
  const yetkiKodu = one(sp.yetkiKodu);
  const durum = one(sp.durum);
  const listingId = one(sp.listingId);

  const deepScheme =
    process.env.EIDS_APP_DEEP_LINK_SCHEME?.trim() || "otopazari://eids/result";
  const q = new URLSearchParams();
  if (yetkiKodu) q.set("yetkiKodu", yetkiKodu);
  if (durum) q.set("durum", durum);
  if (one(sp.state)) q.set("state", one(sp.state));
  q.set("ok", ok ? "1" : "0");
  if (listingId) q.set("listingId", listingId);
  const deepHref = `${deepScheme}${deepScheme.includes("?") ? "&" : "?"}${q.toString()}`;

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-xl font-semibold text-zinc-900">
        {ok ? "Doğrulama tamamlandı" : "Doğrulama sonucu"}
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        {ok
          ? "E-Devlet doğrulaması alındı. Devam etmek için Oto Pazarı uygulamasını açın."
          : "Doğrulama tamamlanamadı veya iptal edildi. Uygulamadan tekrar deneyebilirsiniz."}
      </p>
      {yetkiKodu ? (
        <p className="mt-3 break-all rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
          Yetki kodu: {yetkiKodu}
        </p>
      ) : null}
      <a
        href={deepHref}
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#ffcc00] px-4 py-2.5 text-sm font-semibold text-zinc-900"
      >
        Uygulamayı aç
      </a>
      <Link
        href={listingId ? `/ilan-duzenle/${listingId}` : "/profil/ilanlarim"}
        className="mt-3 text-center text-sm text-emerald-800 underline"
      >
        Web’de devam et
      </Link>
    </div>
  );
}
