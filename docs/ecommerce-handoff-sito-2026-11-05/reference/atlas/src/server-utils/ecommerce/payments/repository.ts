import "server-only";
import { randomUUID } from "node:crypto";
import { commercePayloadHash } from "@evolve/ecommerce-server/assertions";
import {
  getAtlasCommerceStorage,
  type AtlasCommerceTransaction,
} from "../persistence/atlas-storage";
import { orderForCustomer } from "../orders/service";
import { paymentError } from "./config";
import {
  trackingInvalidationPatch,
  clearTrackingProjection,
} from "../fulfillments/state";
export type PaymentTx = AtlasCommerceTransaction;
export const orderPaymentHash = (order: any) =>
  commercePayloadHash({
    id: order.publicId,
    accountId: String(order.accountId),
    customerId: String(order.customerId),
    number: order.number,
    lines: order.lines,
    totals: order.totals,
    billing: order.billing,
    shipping: order.shipping || null,
    fulfillmentSelections: order.fulfillmentSelections || [],
    termsVersion: order.termsVersion,
    pricingPolicyVersion: order.pricingPolicyVersion,
  });
export async function lockPaymentOrder(
  tx: PaymentTx,
  filter: Record<string, unknown>,
) {
  const order = await tx.internal.orders
    .findOneAndUpdate(
      { ...filter, shopId: tx.shopId },
      { $inc: { guard: 1 } },
      { session: tx.session, new: true },
    )
    .lean();
  if (!order) paymentError(404, "ORDER_NOT_FOUND", "Ordine non disponibile.");
  return order;
}
export async function updatePaymentOrder(
  tx: PaymentTx,
  order: any,
  patch: Record<string, unknown>,
) {
  const changesTracking = ["operationalStatus", "fulfillmentStatus"].some(
    (key) => Object.hasOwn(patch, key) && patch[key] !== order[key],
  );
  const updated = await tx.internal.orders
    .findOneAndUpdate(
      { shopId: tx.shopId, _id: order._id, revision: order.revision },
      {
        $set: {
          ...patch,
          ...(changesTracking ? trackingInvalidationPatch(order) : {}),
        },
        $inc: { revision: 1 },
      },
      { session: tx.session, new: true },
    )
    .lean();
  if (!updated)
    paymentError(409, "ORDER_CHANGED", "Ordine modificato. Ricarica i dati.");
  if (changesTracking) await clearTrackingProjection(tx, order);
  const view = orderForCustomer(updated),
    fields = {
      operationalStatus: view.operationalStatus,
      paymentStatus: view.paymentStatus,
      fulfillmentStatus: view.fulfillmentStatus,
      ...(updated.paymentSummary
        ? { paymentSummary: updated.paymentSummary }
        : {}),
    };
  const result = await tx.storefront.orderViews.updateOne(
    { shopId: tx.shopId, publicId: order.publicId, accountId: order.accountId },
    { $set: fields, $inc: { revision: 1 } },
    { session: tx.session },
  );
  if (result.matchedCount !== 1)
    paymentError(503, "ORDER_VIEW_UNAVAILABLE", "Dati ordine non disponibili.");
  return updated;
}
export async function claimPaymentWork(
  model: "paymentAttempts" | "refunds",
  id: string,
) {
  const storage = await getAtlasCommerceStorage(),
    now = new Date(),
    token = randomUUID();
  const row = await storage.internal[model]
    .findOneAndUpdate(
      {
        shopId: process.env.ECOMMERCE_SHOP_ID,
        publicId: id,
        $or: [
          { workLease: { $exists: false } },
          { "workLease.expiresAt": { $lte: now } },
        ],
      },
      {
        $set: {
          workLease: { token, expiresAt: new Date(now.getTime() + 120000) },
        },
        $inc: { revision: 1 },
      },
      { new: true },
    )
    .lean();
  return row;
}
export const workFilter = (shopId: string, row: any) => ({
  shopId,
  _id: row._id,
  "workLease.token": row.workLease.token,
  "workLease.expiresAt": { $gt: new Date() },
});
export const providerActor = (merchantId: string) => ({
  kind: "provider" as const,
  id: `stripe:${merchantId}`,
  requestId: randomUUID(),
});
