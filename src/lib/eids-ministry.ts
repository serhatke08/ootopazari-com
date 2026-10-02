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
  return (
    process.env.EIDS_PROXY_URL?.trim() ||
    process.env.EIDS_PROXY_BASE_URL?.trim() ||
    DEFAULT_PROXY
  ).replace(/\/$/, "");
}

function proxySecret(): string {
  return process.env.EIDS_PROXY_SECRET?.trim() || "";
}

/** TR gsm → kanonik 10 hane (5xxxxxxxxx). */
export function normalizeGsmNo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("5")) return digits;
  if (digits.length === 11 && digits.startsWith("05")) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith("905")) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith("905")) return digits.slice(3);
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    if (last10.startsWith("5")) return last10;
  }
  return null;
}

/**
 * Bakanlık / e-Devlet bazen 5…, 05… veya 90… ister.
 * GetKullaniciKodu için tüm makul adayları dene.
 */
export function gsmNoCandidates(raw: string | null | undefined): string[] {
  const base = normalizeGsmNo(raw);
  if (!base) return [];
  const out = [base, `0${base}`, `90${base}`];
  return Array.from(new Set(out));
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
  // e-Devlet 905… gösterebilir; app 5… tutar — üçünü de dene.
  const gsmCandidates = gsmNoCandidates(params.gsmNo);
  if (gsmCandidates.length === 0) {
    const digits = params.gsmNo.replace(/\D/g, "");
    if (digits.length >= 10) gsmCandidates.push(digits);
  }

  let last: GetKullaniciKoduResult | null = null;
  for (const gsmNo of gsmCandidates) {
    const body: Record<string, unknown> = {
      yetkiKodu: params.yetkiKodu,
      gsmNo,
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

    last = {
      ok,
      httpStatus: status,
      ad,
      soyad,
      kullaniciKodu,
      hataMesaji,
      hataKodu,
      raw: json,
    };
    if (ok) return last;
  }
  return (
    last ?? {
      ok: false,
      httpStatus: 502,
      hataMesaji: "kullanici_kodu_failed",
    }
  );
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
    // Bakanlık alan adı dokümana göre değişebiliyor — ikisini de gönder.
    firmaKod: getEidsFirmaKodu(),
    firmaKodu: getEidsFirmaKodu(),
    kullaniciKodu: params.kullaniciKodu,
    plakaNo: params.plakaNo,
    // Canlı teyit (2 Eki 2026): doğru uç /EidsAracApi — /EidsApi/Arac/Yetki timeout/05_
    _path: "/EidsAracApi",
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

  // Proxy bazen bozuk gövdeyi { raw: "l{...}" } diye sarar
  let parsedFromRaw: Record<string, unknown> | null = null;
  if (typeof map.raw === "string") {
    const s = map.raw.trim().replace(/^[^{[]+/, "");
    try {
      const p = JSON.parse(s);
      if (p && typeof p === "object") parsedFromRaw = p as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }
  const src = parsedFromRaw ?? map;

  const statusCode =
    typeof src.statusCode === "number"
      ? src.statusCode
      : typeof map.statusCode === "number"
        ? map.statusCode
        : status >= 200 && status < 300
          ? 200
          : status;
  const errors = Array.isArray(src.errors)
    ? (src.errors as unknown[]).map((e) => String(e))
    : Array.isArray(map.errors)
      ? (map.errors as unknown[]).map((e) => String(e))
      : src.Message
        ? [String(src.Message)]
        : map.Message
          ? [String(map.Message)]
          : typeof map.raw === "string" && map.raw.trim()
            ? [map.raw.trim().slice(0, 200)]
            : null;
  const dataRaw =
    src.data && typeof src.data === "object"
      ? (src.data as Record<string, unknown>)
      : map.data && typeof map.data === "object"
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
