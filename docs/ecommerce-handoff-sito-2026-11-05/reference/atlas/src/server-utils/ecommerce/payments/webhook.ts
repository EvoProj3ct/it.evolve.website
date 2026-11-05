import "server-only";
import { createHash } from "node:crypto";
import {
  commerceJson,
  commerceRequestId,
  commerceErrorResponse,
} from "@evolve/ecommerce-server/identity";
import { withAtlasCommerceTransaction } from "../persistence/atlas-storage";
import { paymentConfig, paymentError, paymentScope } from "./config";
import { webhookClient } from "./stripe";
import { providerActor } from "./repository";
export const STRIPE_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.expired",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "payment_intent.succeeded",
  "payment_intent.processing",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "charge.refunded",
  "refund.created",
  "refund.updated",
  "refund.failed",
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed",
  "charge.dispute.funds_withdrawn",
  "charge.dispute.funds_reinstated",
]);
async function rawBody(request: Request) {
  if (
    request.headers.has("cookie") ||
    request.headers.has("origin") ||
    new URL(request.url).search
  )
    paymentError(400, "WEBHOOK_INVALID", "Notifica non valida.");
  if (
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
      request.headers.get("content-type") || "",
    )
  )
    paymentError(415, "JSON_REQUIRED", "Contenuto JSON richiesto.");
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > 2097152))
    paymentError(413, "BODY_TOO_LARGE", "Notifica troppo grande.");
  const reader = request.body?.getReader();
  if (!reader) paymentError(400, "WEBHOOK_INVALID", "Notifica non valida.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2097152) {
        await reader.cancel();
        paymentError(413, "BODY_TOO_LARGE", "Notifica troppo grande.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
export async function stripeWebhook(request: Request) {
  const requestId = commerceRequestId();
  try {
    const config = paymentConfig(),
      secret = process.env.ECOMMERCE_STRIPE_WEBHOOK_SECRET || "",
      signature = request.headers.get("stripe-signature") || "";
    if (!/^whsec_[A-Za-z0-9]+$/.test(secret))
      paymentError(
        503,
        "WEBHOOK_NOT_CONFIGURED",
        "Notifiche pagamento non configurate.",
      );
    const stamps = signature
      .split(",")
      .filter((value) => /^t=\d+$/.test(value));
    if (
      signature.length > 4096 ||
      stamps.length !== 1 ||
      Math.abs(Date.now() / 1000 - Number(stamps[0].slice(2))) > 300
    )
      paymentError(
        400,
        "WEBHOOK_SIGNATURE_INVALID",
        "Firma notifica non valida.",
      );
    const raw = await rawBody(request);
    let event: any;
    try {
      event = webhookClient(config).webhooks.constructEvent(
        raw,
        signature,
        secret,
        300,
      );
    } catch {
      paymentError(
        400,
        "WEBHOOK_SIGNATURE_INVALID",
        "Firma notifica non valida.",
      );
    }
    if (
      event.object !== "event" ||
      !/^evt_[A-Za-z0-9]+$/.test(event.id || "") ||
      event.id.length > 250 ||
      event.livemode !== (config.mode === "live") ||
      event.account ||
      event.api_version !== "2026-10-28.endive"
    )
      paymentError(
        400,
        "WEBHOOK_SCOPE_INVALID",
        "Notifica non compatibile con questo ambiente.",
      );
    if (!STRIPE_EVENTS.has(event.type))
      return commerceJson({ received: true }, { requestId });
    const objectId = event.data?.object?.id;
    if (
      typeof objectId !== "string" ||
      objectId.length > 250 ||
      !/^[a-z]{2,15}_[A-Za-z0-9_]+$/.test(objectId)
    )
      paymentError(400, "WEBHOOK_INVALID", "Riferimento notifica non valido.");
    await withAtlasCommerceTransaction(
      providerActor(config.merchantId),
      async (tx) => {
        const existing = await tx.internal.paymentEvents
          .findOne({
            shopId: tx.shopId,
            ...paymentScope(config),
            providerEventId: event.id,
          })
          .session(tx.session)
          .lean();
        if (existing) return;
        await new tx.internal.paymentEvents({
          shopId: tx.shopId,
          ...paymentScope(config),
          providerEventId: event.id,
          eventType: event.type,
          providerObjectId: objectId,
          bodyHash: createHash("sha256").update(raw).digest("hex"),
          signatureVerifiedAt: new Date(),
          availableAt: new Date(),
        }).save({ session: tx.session });
      },
    );
    return commerceJson({ received: true }, { requestId });
  } catch (error: any) {
    // Concurrent redelivery: the unique durable receipt is sufficient for acknowledgment.
    if (error?.code === 11000 && error?.keyPattern?.providerEventId)
      return commerceJson({ received: true }, { requestId });
    return commerceErrorResponse(error, requestId);
  }
}
