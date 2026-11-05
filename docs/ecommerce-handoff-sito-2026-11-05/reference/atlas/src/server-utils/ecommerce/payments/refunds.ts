import "server-only";
import { randomUUID } from "node:crypto";
import { commercePayloadHash } from "@evolve/ecommerce-server/assertions";
import {
  getAtlasCommerceStorage,
  withAtlasCommerceTransaction,
} from "../persistence/atlas-storage";
import { appendCommerceAudit } from "../persistence/core-adapters";
import type { CommerceActor } from "@evolve/ecommerce-server/persistence";
import {
  assertPaymentScope,
  objectReference,
  paymentConfig,
  paymentError,
  paymentScope,
  PaymentReviewError,
  stripeId,
} from "./config";
import { stripeGateway } from "./stripe";
import { cancelUnpaidRevenue } from "./core-ledger";
import {
  claimPaymentWork,
  lockPaymentOrder,
  providerActor,
  updatePaymentOrder,
  workFilter,
} from "./repository";
import { reconcileAttempt } from "./reconcile";
export interface RefundInput {
  orderNumber: string;
  expectedRevision: number;
  amountMinor: number;
  reason: "requested_by_customer" | "duplicate";
  idempotencyKey: string;
}
export async function requestRefund(
  actor: CommerceActor,
  attemptId: string,
  input: RefundInput,
) {
  const config = paymentConfig();
  return withAtlasCommerceTransaction(actor, async (tx) => {
    const attempt = await tx.internal.paymentAttempts
      .findOne({ shopId: tx.shopId, publicId: attemptId })
      .session(tx.session)
      .lean();
    if (!attempt)
      paymentError(404, "PAYMENT_NOT_FOUND", "Pagamento non disponibile.");
    assertPaymentScope(attempt, config);
    const order = await lockPaymentOrder(tx, { _id: attempt!.orderId }),
      idempotencyKeyHash = commercePayloadHash([
        tx.shopId,
        actor.id,
        input.idempotencyKey,
      ]),
      requestHash = commercePayloadHash({
        attemptId,
        orderNumber: input.orderNumber,
        expectedRevision: input.expectedRevision,
        amountMinor: input.amountMinor,
        reason: input.reason,
      }),
      filter = {
        shopId: tx.shopId,
        staffId: actor.id,
        kind: "request_refund",
        idempotencyKeyHash,
      };
    const existing = await tx.internal.staffCommandInbox
      .findOne(filter)
      .session(tx.session)
      .lean();
    if (existing) {
      if (existing.requestHash !== requestHash)
        paymentError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "Chiave già usata per un rimborso diverso.",
        );
      const previous = await tx.internal.refunds
        .findOne({ shopId: tx.shopId, sourceCommandId: existing._id })
        .session(tx.session)
        .lean();
      if (!previous)
        paymentError(503, "REFUND_UNAVAILABLE", "Rimborso non disponibile.");
      return { id: previous!.publicId, state: previous!.state };
    }
    if (
      order.revision !== input.expectedRevision ||
      order.number !== input.orderNumber
    )
      paymentError(
        409,
        "ORDER_CHANGED",
        "Ordine modificato. Ricarica e conferma il numero ordine.",
      );
    const receipt = await tx.internal.paymentReceipts
      .findOne({
        shopId: tx.shopId,
        orderId: order._id,
        paymentAttemptId: attempt!._id,
      })
      .session(tx.session)
      .lean();
    if (
      !receipt ||
      (!["paid", "partially_refunded"].includes(order.paymentStatus) &&
        !(
          order.paymentStatus === "under_review" &&
          attempt!.reviewCode === "LATE_PAYMENT_CANCELLED_ORDER"
        ))
    )
      paymentError(
        409,
        "REFUND_NOT_ALLOWED",
        "Questo pagamento richiede una verifica prima del rimborso.",
      );
    const pending = await tx.internal.refunds
      .exists({
        shopId: tx.shopId,
        orderId: order._id,
        state: { $in: ["requested", "processing", "under_review"] },
      })
      .session(tx.session);
    if (pending)
      paymentError(
        409,
        "REFUND_ALREADY_PENDING",
        "Esiste già un rimborso da completare per questo ordine.",
      );
    const posted = await tx.internal.refundReceipts
        .find({ shopId: tx.shopId, orderId: order._id })
        .session(tx.session)
        .lean(),
      refunded = posted.reduce(
        (sum: number, entry: any) => sum + entry.amountMinor,
        0,
      );
    if (
      !Number.isSafeInteger(input.amountMinor) ||
      input.amountMinor < 1 ||
      input.amountMinor > receipt!.amountMinor - refunded
    )
      paymentError(
        400,
        "REFUND_AMOUNT_INVALID",
        "Importo superiore al residuo rimborsabile.",
      );
    const command = await new tx.internal.staffCommandInbox({
      ...filter,
      publicId: randomUUID(),
      capability: "ecommerce.payments.refund",
      requestHash,
      requestId: actor.requestId,
      payload: {
        request_refund: {
          orderPublicId: order.publicId,
          paymentAttemptId: attempt!._id,
          amountMinor: input.amountMinor,
          expectedRevision: input.expectedRevision,
          reasonCode: input.reason,
        },
      },
    }).save({ session: tx.session });
    const refund = await new tx.internal.refunds({
      shopId: tx.shopId,
      publicId: randomUUID(),
      orderId: order._id,
      paymentAttemptId: attempt!._id,
      sourceCommandId: command._id,
      ...paymentScope(config),
      providerPaymentId: receipt!.providerPaymentId,
      amountMinor: input.amountMinor,
      currency: "EUR",
      providerIdempotencyKey: `commerce-refund-${tx.shopId}-${randomUUID()}`,
      state: "requested",
      reasonCode: input.reason,
      actor,
      recoveryDeadline: new Date(Date.now() + 20 * 3600000),
      nextReconcileAt: new Date(),
    }).save({ session: tx.session });
    await updatePaymentOrder(tx, order, { paymentStatus: "refund_pending" });
    await appendCommerceAudit(tx, {
      action: "refund.requested",
      objectType: "order",
      objectId: order.publicId,
      outcome: "accepted",
      reasonCode: input.reason,
    });
    return { id: refund.publicId, state: refund.state };
  });
}
export async function processRefund(id: string, recoveredRefundId?: string) {
  const claimed = await claimPaymentWork("refunds", id);
  if (!claimed) return;
  const storage = await getAtlasCommerceStorage();
  try {
    const config = paymentConfig();
    assertPaymentScope(claimed, config);
    const attempt = await storage.internal.paymentAttempts
        .findOne({
          shopId: process.env.ECOMMERCE_SHOP_ID,
          _id: claimed.paymentAttemptId,
        })
        .lean(),
      order = await storage.internal.orders
        .findOne({
          shopId: process.env.ECOMMERCE_SHOP_ID,
          _id: claimed.orderId,
        })
        .lean();
    if (
      !attempt ||
      !order ||
      !claimed.providerPaymentId ||
      claimed.providerPaymentId !== attempt.providerPaymentId
    )
      throw new PaymentReviewError("REFUND_REFERENCE_MISMATCH");
    const client = await stripeGateway(config);
    let providerId = claimed.providerRefundId || recoveredRefundId;
    if (
      recoveredRefundId &&
      claimed.providerRefundId &&
      claimed.providerRefundId !== recoveredRefundId
    )
      throw new PaymentReviewError("REFUND_REFERENCE_MISMATCH");
    let refund: any;
    if (providerId) {
      stripeId(providerId, "re");
      refund = await client.refunds.retrieve(providerId);
    } else {
      if (
        !["requested", "processing", "under_review"].includes(claimed.state) ||
        !claimed.recoveryDeadline ||
        claimed.recoveryDeadline <= new Date()
      )
        throw new PaymentReviewError("REFUND_RECOVERY_REQUIRED");
      if (!claimed.creationStartedAt) {
        const started = await storage.internal.refunds.updateOne(
          {
            ...workFilter(process.env.ECOMMERCE_SHOP_ID!, claimed),
            creationStartedAt: { $exists: false },
          },
          { $set: { creationStartedAt: new Date() }, $inc: { revision: 1 } },
        );
        if (started.matchedCount !== 1)
          paymentError(
            409,
            "PAYMENT_LEASE_LOST",
            "Riconciliazione già in corso.",
          );
      }
      refund = await client.refunds.create(
        {
          payment_intent: claimed.providerPaymentId,
          amount: claimed.amountMinor,
          reason: claimed.reasonCode,
          metadata: {
            shop_id: process.env.ECOMMERCE_SHOP_ID!,
            order_id: order.publicId,
            attempt_id: attempt.publicId,
            refund_id: claimed.publicId,
          },
        },
        { idempotencyKey: claimed.providerIdempotencyKey },
      );
    }
    if (
      objectReference(refund.payment_intent) !== claimed.providerPaymentId ||
      refund.amount !== claimed.amountMinor ||
      refund.currency !== "eur" ||
      refund.metadata?.shop_id !== process.env.ECOMMERCE_SHOP_ID ||
      refund.metadata?.refund_id !== claimed.publicId ||
      refund.metadata?.order_id !== order.publicId ||
      refund.metadata?.attempt_id !== attempt.publicId
    )
      throw new PaymentReviewError("REFUND_MISMATCH");
    const saved = await storage.internal.refunds.updateOne(
      workFilter(process.env.ECOMMERCE_SHOP_ID!, claimed),
      {
        $set: {
          providerRefundId: refund.id,
          state: ["failed", "canceled"].includes(refund.status)
            ? refund.status === "canceled"
              ? "cancelled"
              : "failed"
            : "processing",
          nextReconcileAt: new Date(Date.now() + 300000),
        },
        $unset: { workLease: 1, reviewCode: 1, lastErrorCode: 1 },
        $inc: { revision: 1 },
      },
    );
    if (saved.matchedCount !== 1)
      paymentError(409, "PAYMENT_LEASE_LOST", "Riconciliazione da ripetere.");
    await reconcileAttempt(attempt.publicId);
  } catch (error: any) {
    const review = error instanceof PaymentReviewError,
      definitive =
        error?.type === "StripeInvalidRequestError" &&
        [
          "charge_already_refunded",
          "charge_disputed",
          "amount_too_large",
          "refund_amount_invalid",
        ].includes(error?.code);
    await storage.internal.refunds
      .updateOne(workFilter(process.env.ECOMMERCE_SHOP_ID!, claimed), {
        $set: {
          state: definitive ? "failed" : review ? "under_review" : "processing",
          ...(review ? { reviewCode: error.code } : {}),
          lastErrorCode: definitive
            ? "REFUND_REJECTED"
            : review
              ? error.code
              : "STRIPE_UNAVAILABLE",
          nextReconcileAt: new Date(Date.now() + 300000),
        },
        $unset: { workLease: 1 },
        $inc: { revision: 1 },
      })
      .catch(() => undefined);
    if (definitive) {
      const attempt = await storage.internal.paymentAttempts
        .findById(claimed.paymentAttemptId)
        .lean();
      if (attempt) await reconcileAttempt(attempt.publicId);
      return;
    }
    if (review)
      await storage.internal.paymentAttempts.updateOne(
        {
          shopId: process.env.ECOMMERCE_SHOP_ID,
          _id: claimed.paymentAttemptId,
        },
        {
          $set: {
            reviewCode: "REFUND_REVIEW_REQUIRED",
            nextReconcileAt: new Date(),
          },
          $inc: { revision: 1 },
        },
      );
    if (!review) throw error;
  }
}
export async function cancelUnpaidOrder(
  actor: CommerceActor,
  attemptId: string,
  input: {
    expectedRevision: number;
    orderNumber: string;
    idempotencyKey: string;
  },
) {
  return withAtlasCommerceTransaction(actor, async (tx) => {
    const attempt = await tx.internal.paymentAttempts
      .findOne({ shopId: tx.shopId, publicId: attemptId })
      .session(tx.session)
      .lean();
    if (!attempt)
      paymentError(404, "PAYMENT_NOT_FOUND", "Pagamento non disponibile.");
    const order = await lockPaymentOrder(tx, { _id: attempt!.orderId }),
      idempotencyKeyHash = commercePayloadHash([
        tx.shopId,
        actor.id,
        input.idempotencyKey,
      ]),
      requestHash = commercePayloadHash({
        attemptId,
        expectedRevision: input.expectedRevision,
        orderNumber: input.orderNumber,
      }),
      filter = {
        shopId: tx.shopId,
        staffId: actor.id,
        kind: "cancel_order",
        idempotencyKeyHash,
      },
      previous = await tx.internal.staffCommandInbox
        .findOne(filter)
        .session(tx.session)
        .lean();
    if (previous) {
      if (previous.requestHash !== requestHash)
        paymentError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "Chiave già usata per un’altra operazione.",
        );
      return { attemptId: attempt!.publicId };
    }
    if (
      order.revision !== input.expectedRevision ||
      order.number !== input.orderNumber
    )
      paymentError(
        409,
        "ORDER_CHANGED",
        "Ordine modificato. Ricarica e conferma il numero ordine.",
      );
    const paid = await tx.internal.paymentReceipts
      .exists({ shopId: tx.shopId, orderId: order._id })
      .session(tx.session);
    if (
      paid ||
      order.operationalStatus !== "open" ||
      !["awaiting", "processing", "failed", "expired"].includes(
        order.paymentStatus,
      ) ||
      order.fulfillment.some(
        (line: any) =>
          line.fulfilledQuantity > 0 ||
          line.shippedQuantity > 0 ||
          line.state !== "unfulfilled",
      )
    )
      paymentError(
        409,
        "ORDER_CANCELLATION_REVIEW",
        "L’ordine richiede una verifica prima dell’annullamento.",
      );
    await cancelUnpaidRevenue(tx, order);
    await updatePaymentOrder(tx, order, {
      operationalStatus: "cancelled",
      fulfillmentStatus: "cancelled",
    });
    await tx.internal.paymentAttempts.updateMany(
      { shopId: tx.shopId, orderId: order._id, active: true },
      {
        $set: { cancellationRequested: true, nextReconcileAt: new Date() },
        $inc: { revision: 1 },
      },
      { session: tx.session },
    );
    await new tx.internal.staffCommandInbox({
      ...filter,
      publicId: randomUUID(),
      requestHash,
      requestId: actor.requestId,
      capability: "ecommerce.orders.cancel",
      payload: {
        cancel_order: {
          orderPublicId: order.publicId,
          expectedRevision: input.expectedRevision,
          reasonCode: "staff_cancel_unpaid",
        },
      },
    }).save({ session: tx.session });
    await appendCommerceAudit(tx, {
      action: "order.cancelled_unpaid",
      objectType: "order",
      objectId: order.publicId,
      outcome: "succeeded",
    });
    return { attemptId: attempt!.publicId };
  });
}
