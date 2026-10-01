import "server-only";

const DEFAULT_PROXY = "http://138.199.227.195";
const FIRMA_KODU_DEFAULT = "728bd568-8fd8-4632-9207-83e0d6b0bb0f";

export function getEidsFirmaKodu(): string {
  return (
    process.env.EIDS_FIRMA_KODU?.trim() ||
    process.env.NEXT_PUBLIC_EIDS_FIRMA_KODU?.trim() ||
    FIRMA_KODU_DEFAULT
  );
}

function proxyBase(): string {
  return (process.env.EIDS_PROXY_URL?.trim() || DEFAULT_PROXY).replace(
    /\/$/,
    ""
  );
}

function proxySecret(): string {
  return process.env.EIDS_PROXY_SECRET?.trim() || "";
}

/** TR gsm → 10 hane (5xxxxxxxxx). */
export function normalizeGsmNo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("5")) return digits;
  if (digits.length === 11 && digits.startsWith("05")) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith("905")) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith("905")) return digits.slice(2);
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    if (last10.startsWith("5")) return last10;
  }
  return null;
}

/** Plaka: boşluksuz büyük harf. */
export function normalizePlakaNo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = String(raw)
    .trim()
    .toLocaleUpperCase("tr")
    .replace(/\s+/g, "")
    .replace(/[^0-9A-ZÇĞİÖŞÜ]/g, "");
  return t.length >= 5 ? t : null;
}

export type GetKullaniciKoduResult = {
  ok: boolean;
  httpStatus: number;
  ad?: string | null;
  soyad?: string | null;
  kullaniciKodu?: string | null;
  hataMesaji?: string | null;
  hataKodu?: string | null;
  raw?: unknown;
};

export type AracYetkiResult = {
  ok: boolean;
  httpStatus: number;
  statusCode?: number | null;
  data?: {
    markaAdi?: string | null;
    ticariAdi?: string | null;
    modelYili?: string | null;
    ilanSuresi?: string | null;
  } | null;
  errors?: string[] | null;
  raw?: unknown;
};

async function proxyPost(
  path: string,
  body: Record<string, unknown>
): Promise<{ status: number; json: unknown }> {
  const secret = proxySecret();
  if (!secret) {
    throw new Error("eids_proxy_secret_missing");
  }
  const res = await fetch(`${proxyBase()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-eids-proxy-secret": secret,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

/** Faz 1 sonrası — yetkiKodu 2 dk geçerli. */
export async function callGetKullaniciKodu(params: {
  yetkiKodu: string;
  gsmNo: string;
  vergiNo?: string | null;
}): Promise<GetKullaniciKoduResult> {
  const body: Record<string, unknown> = {
    yetkiKodu: params.yetkiKodu,
    gsmNo: params.gsmNo,
  };
  if (params.vergiNo?.trim()) body.vergiNo = params.vergiNo.trim();

  const { status, json } = await proxyPost("/eids/kullanici-kodu", body);
  const map =
    json && typeof json === "object"
      ? (json as Record<string, unknown>)
      : {};

  const kullaniciKodu =
    (map.kullaniciKodu ?? map.kullanici_kodu)?.toString()?.trim() || null;
  const hataMesaji =
    (map.hataMesaji ?? map.Message ?? map.message)?.toString() || null;
  const hataKodu = (map.hataKodu ?? map.hata_kodu)?.toString() || null;
  const ad = map.ad?.toString() || null;
  const soyad = map.soyad?.toString() || null;

  const ok =
    status >= 200 &&
    status < 300 &&
    Boolean(kullaniciKodu) &&
    !hataKodu;

  return {
    ok,
    httpStatus: status,
    ad,
    soyad,
    kullaniciKodu,
    hataMesaji,
    hataKodu,
    raw: json,
  };
}

/** Faz 2 — plaka yetkisi. */
export async function callEidsAracYetki(params: {
  kullaniciKodu: string;
  plakaNo: string;
  ilanNo?: string | null;
  vergiNo?: string | null;
  yetkiBelgeNo?: string | null;
}): Promise<AracYetkiResult> {
  const body: Record<string, unknown> = {
    firmaKod: getEidsFirmaKodu(),
    kullaniciKodu: params.kullaniciKodu,
    plakaNo: params.plakaNo,
  };
  if (params.ilanNo?.trim()) body.ilanNo = params.ilanNo.trim();
  if (params.vergiNo?.trim()) body.vergiNo = params.vergiNo.trim();
  if (params.yetkiBelgeNo?.trim()) {
    body.yetkiBelgeNo = params.yetkiBelgeNo.trim();
  }

  const { status, json } = await proxyPost("/eids/arac-yetki", body);
  const map =
    json && typeof json === "object"
      ? (json as Record<string, unknown>)
      : {};

  const statusCode =
    typeof map.statusCode === "number"
      ? map.statusCode
      : status >= 200 && status < 300
        ? 200
        : status;
  const errors = Array.isArray(map.errors)
    ? (map.errors as unknown[]).map((e) => String(e))
    : map.Message
      ? [String(map.Message)]
      : null;
  const dataRaw =
    map.data && typeof map.data === "object"
      ? (map.data as Record<string, unknown>)
      : null;
  const data = dataRaw
    ? {
        markaAdi: dataRaw.markaAdi?.toString() ?? null,
        ticariAdi: dataRaw.ticariAdi?.toString() ?? null,
        modelYili: dataRaw.modelYili?.toString() ?? null,
        ilanSuresi: dataRaw.ilanSuresi?.toString() ?? null,
      }
    : null;

  const ok =
    status >= 200 &&
    status < 300 &&
    statusCode === 200 &&
    (errors == null || errors.length === 0) &&
    data != null;

  return {
    ok,
    httpStatus: status,
    statusCode,
    data,
    errors,
    raw: json,
  };
}
