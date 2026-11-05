import "server-only";
import { createHash } from "node:crypto";
import { CommerceServiceError } from "@evolve/ecommerce-server/identity";
export const STRIPE_API_VERSION = "2026-10-28.endive" as const;
export const paymentError = (
  status: number,
  code: string,
  message: string,
): never => {
  throw new CommerceServiceError(status, code, message);
};
export class PaymentReviewError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
export function paymentConfig() {
  const mode = process.env.ECOMMERCE_STRIPE_MODE,
    merchantId = process.env.ECOMMERCE_STRIPE_ACCOUNT_ID || "",
    secret = process.env.ECOMMERCE_STRIPE_SECRET_KEY || "",
    returnOrigin = process.env.ECOMMERCE_ASSERTION_ISSUER || "",
    methods = (process.env.ECOMMERCE_STRIPE_PAYMENT_METHODS || "")
      .split(",")
      .map((value) => value.trim());
  try {
    const origin = new URL(returnOrigin);
    if (
      !["test", "live"].includes(mode || "") ||
      !/^acct_[A-Za-z0-9]+$/.test(merchantId) ||
      !new RegExp(`^(?:sk|rk)_${mode}_[A-Za-z0-9]+$`).test(secret) ||
      origin.protocol !== "https:" ||
      origin.origin !== returnOrigin ||
      origin.username ||
      origin.password ||
      !methods.length ||
      methods.length > 2 ||
      new Set(methods).size !== methods.length ||
      methods.some((value) => !["card", "paypal"].includes(value)) ||
      ![undefined, "", "false", "true"].includes(
        process.env.ECOMMERCE_STRIPE_ENABLED,
      )
    )
      throw new Error();
  } catch {
    return paymentError(
      503,
      "PAYMENTS_NOT_CONFIGURED",
      "Pagamenti non configurati.",
    );
  }
  return {
    provider: "stripe" as const,
    mode: mode as "test" | "live",
    merchantId,
    secret,
    returnOrigin,
    methods: methods as ("card" | "paypal")[],
    enabled: process.env.ECOMMERCE_STRIPE_ENABLED === "true",
    signature: createHash("sha256")
      .update(`${secret}\0${merchantId}\0${mode}`)
      .digest("hex"),
  };
}
export type PaymentConfig = ReturnType<typeof paymentConfig>;
export const paymentScope = (config: PaymentConfig) => ({
  provider: config.provider,
  merchantId: config.merchantId,
  mode: config.mode,
});
export function assertPaymentScope(attempt: any, config: PaymentConfig) {
  if (
    attempt.provider !== "stripe" ||
    attempt.merchantId !== config.merchantId ||
    attempt.mode !== config.mode
  )
    throw new PaymentReviewError("PROVIDER_SCOPE_MISMATCH");
}
export const stripeId = (value: unknown, prefix: string) => {
  if (
    typeof value !== "string" ||
    value.length > 250 ||
    !new RegExp(`^${prefix}_[A-Za-z0-9_]+$`).test(value)
  )
    throw new PaymentReviewError("PROVIDER_REFERENCE_INVALID");
  return value;
};
export const objectReference = (value: any): string | null =>
  typeof value === "string" ? value : value?.id || null;
export function checkoutUrl(value: unknown) {
  try {
    if (typeof value !== "string" || value.length > 4096) throw new Error();
    const url = new URL(value);
    if (
      url.origin !== "https://checkout.stripe.com" ||
      url.username ||
      url.password ||
      !url.pathname.startsWith("/c/pay/")
    )
      throw new Error();
    return value;
  } catch {
    throw new PaymentReviewError("CHECKOUT_URL_INVALID");
  }
}
