import "server-only";
import type { CommerceActor } from "@evolve/ecommerce-server/persistence";
import {
  getAtlasCommerceStorage,
  withAtlasCommerceTransaction,
} from "../persistence/atlas-storage";
import { appendCommerceAudit } from "../persistence/core-adapters";
import { paymentConfig, paymentError, paymentScope } from "./config";
import type {
  StaffPaymentAttempt,
  StaffPaymentDetails,
  StaffPaymentsPage,
} from "./types";
function row(attempt: any, order: any): StaffPaymentAttempt {
  return {
    id: attempt.publicId,
    orderPublicId: order?.publicId || "",
    orderNumber: order?.number || "Ordine non disponibile",
    orderRevision: order?.revision ?? -1,
    name: order?.billing.name || "",
    state: attempt.state,
    active: attempt.active,
    amountMinor: attempt.amountMinor,
    refundedMinor: attempt.refundedMinor || 0,
    mode: attempt.mode,
    method: attempt.method || "",
    createdAt: attempt.createdAt.toISOString(),
    paidAt: (attempt.paidAt || attempt.verifiedPaidAt)?.toISOString() || null,
    expiresAt: attempt.expiresAt?.toISOString() || null,
    nextReconcileAt: attempt.nextReconcileAt?.toISOString() || null,
    reviewCode: attempt.reviewCode || null,
    lastErrorCode: attempt.lastErrorCode || null,
    providerSessionId: attempt.providerSessionId || null,
    providerPaymentId: attempt.providerPaymentId || null,
  };
}
export async function staffPayments(
  cursor?: string,
  state?: string,
  orderPublicId?: string,
): Promise<StaffPaymentsPage> {
  const storage = await getAtlasCommerceStorage(),
    shopId = process.env.ECOMMERCE_SHOP_ID!;
  const order = orderPublicId
    ? await storage.internal.orders
        .findOne({ shopId, publicId: orderPublicId })
        .select({ _id: 1 })
        .lean()
    : null;
  if (orderPublicId && !order)
    paymentError(404, "ORDER_NOT_FOUND", "Ordine non disponibile.");
  const states =
    state === "attention"
      ? {
          $or: [
            { reviewCode: { $exists: true } },
            { lastErrorCode: { $exists: true } },
            { state: "under_review" },
          ],
        }
      : state
        ? { state }
        : {};
  const attempts = await storage.internal.paymentAttempts
      .find({
        shopId,
        ...states,
        ...(cursor ? { _id: { $lt: cursor } } : {}),
        ...(order ? { orderId: order._id } : {}),
      })
      .sort({ _id: -1 })
      .limit(31)
      .lean(),
    page = attempts.slice(0, 30),
    orders = await storage.internal.orders
      .find({ shopId, _id: { $in: page.map((entry: any) => entry.orderId) } })
      .lean(),
    byId = new Map(orders.map((entry: any) => [String(entry._id), entry]));
  return {
    items: page.map((entry: any) =>
      row(entry, byId.get(String(entry.orderId))),
    ),
    nextCursor: attempts.length > 30 ? String(page.at(-1)!._id) : null,
  };
}
export async function staffPaymentDetails(
  actor: CommerceActor,
  id: string,
): Promise<StaffPaymentDetails> {
  return withAtlasCommerceTransaction(actor, async (tx) => {
    const attempt = await tx.internal.paymentAttempts
      .findOne({ shopId: tx.shopId, publicId: id })
      .session(tx.session)
      .lean();
    if (!attempt)
      paymentError(404, "PAYMENT_NOT_FOUND", "Pagamento non disponibile.");
    const order = await tx.internal.orders
      .findOne({ shopId: tx.shopId, _id: attempt!.orderId })
      .session(tx.session)
      .lean();
    if (!order) paymentError(404, "ORDER_NOT_FOUND", "Ordine non disponibile.");
    const refunds = await tx.internal.refunds
        .find({ shopId: tx.shopId, orderId: order._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .session(tx.session)
        .lean(),
      adjustments = await tx.internal.refundReceipts
        .find({ shopId: tx.shopId, orderId: order._id })
        .sort({ confirmedAt: -1 })
        .limit(50)
        .session(tx.session)
        .lean(),
      failedEvents = await tx.internal.paymentEvents
        .countDocuments({
          shopId: tx.shopId,
          state: { $in: ["failed", "dead"] },
        })
        .session(tx.session);
    const paymentPosted = await tx.internal.paymentReceipts
      .exists({
        shopId: tx.shopId,
        orderId: order._id,
        paymentAttemptId: attempt!._id,
      })
      .session(tx.session);
    return {
      paymentPosted: !!paymentPosted,
      attempt: row(attempt, order),
      paymentStatus: order.paymentStatus,
      operationalStatus: order.operationalStatus,
      refunds: refunds.map((entry: any) => ({
        id: entry.publicId,
        amountMinor: entry.amountMinor,
        state: entry.state,
        reason: entry.reasonCode,
        createdAt: entry.createdAt.toISOString(),
        reviewCode: entry.reviewCode || entry.lastErrorCode || null,
      })),
      adjustments: adjustments.map((entry: any) => ({
        id: String(entry.adjustmentRevenueId),
        amountMinor: entry.amountMinor,
        netMinor: entry.netMinor,
        taxMinor: entry.taxMinor,
        confirmedAt: entry.confirmedAt.toISOString(),
      })),
      failedEvents,
    };
  });
}
export async function staffFailedEvents() {
  const storage = await getAtlasCommerceStorage();
  const events = await storage.internal.paymentEvents
    .find({
      shopId: process.env.ECOMMERCE_SHOP_ID,
      state: { $in: ["failed", "dead"] },
    })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
  return {
    items: events.map((event: any) => ({
      id: event.providerEventId,
      type: event.eventType,
      state: event.state,
      attempts: event.attempts,
      errorCode: event.lastErrorCode || "",
      receivedAt: event.createdAt.toISOString(),
    })),
  };
}
export async function retryPaymentEvent(actor: CommerceActor, eventId: string) {
  const config = paymentConfig();
  return withAtlasCommerceTransaction(actor, async (tx) => {
    const event = await tx.internal.paymentEvents
      .findOneAndUpdate(
        {
          shopId: tx.shopId,
          ...paymentScope(config),
          providerEventId: eventId,
          state: { $in: ["failed", "dead"] },
        },
        {
          $set: { state: "pending", attempts: 0, availableAt: new Date() },
          $unset: { lease: 1, lastErrorCode: 1, finishedAt: 1 },
          $inc: { revision: 1 },
        },
        { session: tx.session, new: true },
      )
      .lean();
    if (!event)
      paymentError(
        409,
        "PAYMENT_EVENT_CHANGED",
        "Notifica già elaborata o non disponibile.",
      );
    await appendCommerceAudit(tx, {
      action: "payment_event.requeued",
      objectType: "payment_event",
      objectId: eventId,
      outcome: "accepted",
    });
    return { accepted: true };
  });
}
