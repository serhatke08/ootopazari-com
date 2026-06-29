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

  const testMode =
    process.env.PAYTR_TEST_MODE?.trim() === "1" ||
    process.env.NODE_ENV !== "production";

  return { merchantId, merchantKey, merchantSalt, testMode };
}

type BasketItem = [string, string, number];

function encodeUserBasket(items: BasketItem[]): string {
  return Buffer.from(JSON.stringify(items), "utf8").toString("base64");
}

function buildPaytrToken(
  hashStr: string,
  merchantKey: string,
  merchantSalt: string
): string {
  return crypto
    .createHmac("sha256", merchantKey)
    .update(hashStr + merchantSalt)
    .digest("base64");
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

  const paytrToken = buildPaytrToken(
    hashStr,
    config.merchantKey,
    config.merchantSalt
  );

  const body = new URLSearchParams({
    merchant_id: config.merchantId,
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
  });

  const res = await fetch("https://www.paytr.com/odeme/api/get-token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const data = (await res.json()) as { status?: string; token?: string; reason?: string };
  if (data.status === "success" && data.token) {
    return { ok: true, token: data.token };
  }

  return {
    ok: false,
    reason: data.reason ?? "PayTR token alınamadı.",
    status: data.status,
  };
}

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
  const expected = buildPaytrToken(
    hashStr,
    input.config.merchantKey,
    input.config.merchantSalt
  );
  return expected === input.hash;
}
