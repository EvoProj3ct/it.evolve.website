import "server-only";
import { createHash, timingSafeEqual, randomUUID } from "node:crypto";
import {
  claimCommerceJob,
  finishCommerceJob,
  reapExhaustedCommerceJobs,
} from "@evolve/ecommerce-server/persistence";
import {
  commerceJson,
  commerceRequestId,
  commerceErrorResponse,
  CommerceServiceError,
} from "@evolve/ecommerce-server/identity";
import {
  getAtlasCommerceStorage,
  withAtlasCommerceTransaction,
} from "../persistence/atlas-storage";
import {
  paymentConfig,
  paymentError,
  paymentScope,
  objectReference,
  PaymentReviewError,
} from "./config";
import { stripeGateway } from "./stripe";
import { providerActor } from "./repository";
import { reconcileAttempt } from "./reconcile";
import { processRefund } from "./refunds";
const errorCode = (error: unknown) =>
  error instanceof PaymentReviewError || error instanceof CommerceServiceError
    ? error.code
    : "STRIPE_UNAVAILABLE";
async function processOneEvent() {
  const storage = await getAtlasCommerceStorage(),
    shopId = process.env.ECOMMERCE_SHOP_ID!,
    config = paymentConfig();
  const claimed = await claimCommerceJob(storage.internal.paymentEvents, {
    shopId,
    workerId: randomUUID(),
    leaseMs: 120000,
    maxAttempts: 10,
  });
  if (!claimed) return false;
  try {
    if (
      claimed.provider !== "stripe" ||
      claimed.merchantId !== config.merchantId ||
      claimed.mode !== config.mode
    )
      throw new PaymentReviewError("PROVIDER_SCOPE_MISMATCH");
    const client = await stripeGateway(config),
      event: any = await client.events.retrieve(claimed.providerEventId);
    if (
      event.type !== claimed.eventType ||
      event.data?.object?.id !== claimed.providerObjectId ||
      event.livemode !== (config.mode === "live") ||
      event.account
    )
      throw new PaymentReviewError("PROVIDER_EVENT_MISMATCH");
    let metadata: any,
      sessionId: string | undefined,
      piId: string | null = null;
    if (event.type.startsWith("checkout.session.")) {
      const session = await client.checkout.sessions.retrieve(
        claimed.providerObjectId,
      );
      metadata = session.metadata;
      sessionId = session.id;
    } else {
      if (event.type.startsWith("payment_intent."))
        piId = claimed.providerObjectId;
      else if (event.type.startsWith("refund."))
        piId = objectReference(
          (await client.refunds.retrieve(claimed.providerObjectId))
            .payment_intent,
        );
      else {
        let chargeId: string | null = claimed.providerObjectId;
        if (event.type.startsWith("charge.dispute."))
          chargeId = objectReference(
            (await client.disputes.retrieve(claimed.providerObjectId)).charge,
          );
        if (chargeId)
          piId = objectReference(
            (await client.charges.retrieve(chargeId)).payment_intent,
          );
      }
      if (piId)
        metadata = (await client.paymentIntents.retrieve(piId)).metadata;
    }
    if (
      metadata?.shop_id === shopId &&
      typeof metadata.attempt_id === "string"
    ) {
      const attempt = await storage.internal.paymentAttempts
        .findOne({
          shopId,
          ...paymentScope(config),
          publicId: metadata.attempt_id,
        })
        .lean();
      if (attempt) {
        if (!sessionId && !attempt.providerSessionId && piId) {
          const sessions = await client.checkout.sessions.list({
            payment_intent: piId,
            limit: 2,
          });
          const matching = sessions.data.filter(
            (entry) =>
              entry.metadata?.attempt_id === attempt.publicId &&
              entry.metadata?.shop_id === shopId,
          );
          if (sessions.has_more || matching.length !== 1)
            throw new PaymentReviewError("SESSION_RECOVERY_REQUIRED");
          sessionId = matching[0].id;
        }
        if (
          !piId ||
          !attempt.providerPaymentId ||
          attempt.providerPaymentId === piId
        )
          await reconcileAttempt(attempt.publicId, sessionId);
      }
    }
    await withAtlasCommerceTransaction(providerActor(config.merchantId), (tx) =>
      finishCommerceJob(
        tx.internal.paymentEvents,
        {
          shopId,
          id: String(claimed._id),
          expectedRevision: claimed.revision,
          leaseToken: claimed.lease.token,
        },
        { state: "succeeded" },
        tx.session,
      ),
    );
  } catch (error) {
    await withAtlasCommerceTransaction(providerActor(config.merchantId), (tx) =>
      finishCommerceJob(
        tx.internal.paymentEvents,
        {
          shopId,
          id: String(claimed._id),
          expectedRevision: claimed.revision,
          leaseToken: claimed.lease.token,
        },
        {
          state: "failed",
          errorCode: errorCode(error),
          availableAt: new Date(
            Date.now() + Math.min(3600000, 30000 * 2 ** claimed.attempts),
          ),
        },
        tx.session,
      ),
    ).catch(() => undefined);
  }
  return true;
}
export async function runPaymentJobs() {
  const storage = await getAtlasCommerceStorage(),
    shopId = process.env.ECOMMERCE_SHOP_ID!,
    started = Date.now();
  await reapExhaustedCommerceJobs(storage.internal.paymentEvents, {
    shopId,
    maxAttempts: 10,
  });
  let processed = 0,
    errors = 0;
  // Give refunds, events and polling one slot each; a busy queue cannot monopolize a batch.
  for (const kind of ["refund", "event", "attempt"]) {
    if (Date.now() - started >= 20000) break;
    try {
      if (kind === "event") {
        if (await processOneEvent()) processed++;
        continue;
      }
      const due = {
        shopId,
        nextReconcileAt: { $lte: new Date() },
        $or: [
          { workLease: { $exists: false } },
          { "workLease.expiresAt": { $lte: new Date() } },
        ],
      };
      if (kind === "refund") {
        const refund = await storage.internal.refunds
          .findOne({
            ...due,
            state: { $in: ["requested", "processing", "under_review"] },
          })
          .sort({ nextReconcileAt: 1 })
          .lean();
        if (refund) {
          await processRefund(refund.publicId);
          processed++;
        }
      } else {
        const attempt = await storage.internal.paymentAttempts
          .findOne({
            ...due,
            provider: "stripe",
            createdAt: { $gt: new Date(Date.now() - 180 * 86400000) },
          })
          .sort({ nextReconcileAt: 1 })
          .lean();
        if (attempt) {
          await reconcileAttempt(attempt.publicId);
          processed++;
        }
      }
    } catch {
      errors++;
    }
  }
  return { processed, errors };
}
function authorizeWorker(request: Request) {
  const secret = process.env.ECOMMERCE_PAYMENTS_WORKER_SECRET || "",
    value = request.headers.get("authorization") || "";
  if (
    !/^[A-Za-z0-9_-]{43,128}$/.test(secret) ||
    [
      process.env.NEXTAUTH_SECRET,
      process.env.ECOMMERCE_STRIPE_WEBHOOK_SECRET,
      process.env.ECOMMERCE_STRIPE_SECRET_KEY,
    ].includes(secret)
  )
    paymentError(
      503,
      "PAYMENTS_WORKER_NOT_CONFIGURED",
      "Worker non configurato.",
    );
  const token = value.startsWith("Bearer ") ? value.slice(7) : "";
  if (
    token.length > 128 ||
    !timingSafeEqual(
      createHash("sha256").update(token).digest(),
      createHash("sha256").update(secret).digest(),
    ) ||
    request.headers.has("origin") ||
    request.headers.has("cookie") ||
    new URL(request.url).search
  )
    paymentError(401, "WORKER_UNAUTHORIZED", "Richiesta non autorizzata.");
}
export async function paymentJobsHandler(request: Request) {
  const requestId = commerceRequestId();
  try {
    authorizeWorker(request);
    if (
      request.headers.get("content-length") &&
      request.headers.get("content-length") !== "0"
    )
      paymentError(400, "EMPTY_BODY_REQUIRED", "Richiesta vuota richiesta.");
    // Bound even a chunked body. This endpoint accepts no payload or arbitrary command.
    const reader = request.body?.getReader();
    if (reader) {
      try {
        const chunk = await reader.read();
        if (!chunk.done) {
          await reader.cancel();
          paymentError(
            400,
            "EMPTY_BODY_REQUIRED",
            "Richiesta vuota richiesta.",
          );
        }
      } finally {
        reader.releaseLock();
      }
    }
    return commerceJson(await runPaymentJobs(), { requestId });
  } catch (error) {
    return commerceErrorResponse(error, requestId);
  }
}
