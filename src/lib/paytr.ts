import "server-only";
import crypto from "node:crypto";

export type PaytrConfig = {
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
  testMode: boolean;
};

export function tryGetPaytrConfig(): PaytrConfig | null {
  const merchantId = process.env.PAYTR_MERCHANT_ID?.trim();
  const merchantKey = process.env.PAYTR_MERCHANT_KEY?.trim();
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT?.trim();
  if (!merchantId || !merchantKey || !merchantSalt) return null;

  return {
    merchantId,
    merchantKey,
    merchantSalt,
    testMode: process.env.PAYTR_TEST_MODE?.trim() === "1",
  };
}

type BasketItem = [string, string, number];

function encodeUserBasket(items: BasketItem[]): string {
  return Buffer.from(JSON.stringify(items), "utf8").toString("base64");
}

function paytrHmac(data: string, merchantKey: string): string {
  return crypto.createHmac("sha256", merchantKey).update(data).digest("base64");
}

export type PaytrIframeTokenInput = {
  userIp: string;
  merchantOid: string;
  email: string;
  paymentAmountKurus: number;
  basket: BasketItem[];
  okUrl: string;
  failUrl: string;
  userName: string;
  userAddress: string;
  userPhone: string;
};

export type PaytrIframeTokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: string; status?: string };

/** PayTR iFrame API — 1. Adım (get-token) */
export async function createPaytrIframeToken(
  config: PaytrConfig,
  input: PaytrIframeTokenInput
): Promise<PaytrIframeTokenResult> {
  const userBasket = encodeUserBasket(input.basket);
  const noInstallment = "0";
  const maxInstallment = "0";
  const currency = "TL";
  const testMode = config.testMode ? "1" : "0";
  const paymentAmount = String(Math.round(input.paymentAmountKurus));

  const hashStr =
    config.merchantId +
    input.userIp +
    input.merchantOid +
    input.email +
    paymentAmount +
    userBasket +
    noInstallment +
    maxInstallment +
    currency +
    testMode;

  const paytrToken = paytrHmac(hashStr + config.merchantSalt, config.merchantKey);

  const body = new URLSearchParams({
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    merchant_salt: config.merchantSalt,
    user_ip: input.userIp,
    merchant_oid: input.merchantOid,
    email: input.email,
    payment_amount: paymentAmount,
    paytr_token: paytrToken,
    user_basket: userBasket,
    debug_on: config.testMode ? "1" : "0",
    no_installment: noInstallment,
    max_installment: maxInstallment,
    user_name: input.userName,
    user_address: input.userAddress,
    user_phone: input.userPhone,
    merchant_ok_url: input.okUrl,
    merchant_fail_url: input.failUrl,
    timeout_limit: "30",
    currency,
    test_mode: testMode,
    lang: "tr",
  });

  const res = await fetch("https://www.paytr.com/odeme/api/get-token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const data = (await res.json()) as {
    status?: string;
    token?: string;
    reason?: string;
  };

  if (data.status === "success" && data.token) {
    return { ok: true, token: data.token };
  }

  return {
    ok: false,
    reason: data.reason ?? "PayTR token alınamadı.",
    status: data.status,
  };
}

/** PayTR iFrame API — 2. Adım (bildirim URL hash doğrulama) */
export function verifyPaytrCallbackHash(input: {
  merchantOid: string;
  status: string;
  totalAmount: string;
  config: PaytrConfig;
  hash: string;
}): boolean {
  const hashStr =
    input.merchantOid +
    input.config.merchantSalt +
    input.status +
    input.totalAmount;
  const expected = paytrHmac(hashStr, input.config.merchantKey);
  return expected === input.hash;
}

export type PaytrStatusQueryResult =
  | { ok: true; paymentAmountKurus: number }
  | { ok: false; reason: string };

/** Ödeme tamamlandı mı diye PayTR durum sorgusu (başarı sayfası yedek onayı). */
export async function queryPaytrPaymentStatus(
  config: PaytrConfig,
  merchantOid: string
): Promise<PaytrStatusQueryResult> {
  const hashStr = config.merchantId + merchantOid + config.merchantSalt;
  const paytrToken = paytrHmac(hashStr, config.merchantKey);

  const body = new URLSearchParams({
    merchant_id: config.merchantId,
    merchant_oid: merchantOid,
    paytr_token: paytrToken,
  });

  const res = await fetch("https://www.paytr.com/odeme/durum-sorgu", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const data = (await res.json()) as {
    status?: string;
    payment_amount?: string | number;
    err_msg?: string;
  };

  if (data.status !== "success") {
    return {
      ok: false,
      reason: data.err_msg ?? "PayTR ödeme doğrulanamadı.",
    };
  }

  const paymentAmountKurus = Math.round(Number(data.payment_amount ?? 0));
  if (!Number.isFinite(paymentAmountKurus) || paymentAmountKurus <= 0) {
    return { ok: false, reason: "invalid_payment_amount" };
  }

  return { ok: true, paymentAmountKurus };
}
