import "server-only";
import { randomUUID } from "node:crypto";
import { commercePayloadHash } from "@evolve/ecommerce-server/assertions";
import { withAtlasCommerceTransaction } from "../persistence/atlas-storage";
import { appendCommerceAudit } from "../persistence/core-adapters";
import { lockCheckoutPrincipal } from "../checkout/auth";
import type { CheckoutProof } from "../checkout/service";
import {
  integer,
  objectWithKeys,
  parsePrincipal,
  publicId,
} from "../checkout/validation";
import {
  assertPaymentScope,
  checkoutUrl,
  paymentConfig,
  paymentError,
  paymentScope,
  STRIPE_API_VERSION,
} from "./config";
import { lockPaymentOrder, orderPaymentHash } from "./repository";
import { reconcileAttempt } from "./reconcile";
import type { CustomerPaymentStatus } from "./types";
function customerStatus(
  order: any,
  attempt: any,
  url: string | null,
): CustomerPaymentStatus {
  return {
    orderPublicId: order.publicId,
    orderRevision: order.revision,
    paymentStatus: order.paymentStatus,
    paidMinor: order.paymentSummary?.paidMinor || 0,
    refundedMinor: order.paymentSummary?.refundedMinor || 0,
    attempt: attempt
      ? {
          id: attempt.publicId,
          state: attempt.state,
          expiresAt: attempt.expiresAt?.toISOString() || null,
        }
      : null,
    checkoutUrl: url,
  };
}
export async function paymentForSite(
  proof: CheckoutProof,
  operation: "start" | "status",
  orderId: string,
  requestId: string,
) {
  const p = parsePrincipal(proof.body.principal),
    orderPublicId = publicId(orderId),
    input = objectWithKeys(
      proof.body,
      operation === "start"
        ? ["principal", "expectedRevision", "idempotencyKey"]
        : ["principal"],
    ),
    config = operation === "start" ? paymentConfig() : null;
  const prepared = await withAtlasCommerceTransaction(
    { kind: "customer", id: p.accountId, requestId },
    async (tx) => {
      await lockCheckoutPrincipal(tx, proof);
      const order = await lockPaymentOrder(tx, {
        publicId: orderPublicId,
        accountId: p.accountId,
      });
      if (operation === "status") {
        const attempt = await tx.internal.paymentAttempts
          .findOne({
            shopId: tx.shopId,
            orderId: order._id,
            accountId: p.accountId,
          })
          .sort({ createdAt: -1 })
          .session(tx.session)
          .lean();
        return {
          status: customerStatus(order, attempt, null),
          attemptId: null as string | null,
        };
      }
      const expectedRevision = integer(input.expectedRevision),
        keyHash = commercePayloadHash([
          tx.shopId,
          p.accountId,
          publicId(input.idempotencyKey),
        ]),
        requestHash = commercePayloadHash({ orderPublicId, expectedRevision });
      const receipt = await tx.internal.paymentRequests
        .findOne({ shopId: tx.shopId, accountId: p.accountId, keyHash })
        .session(tx.session)
        .lean();
      if (receipt) {
        if (
          receipt.requestHash !== requestHash ||
          String(receipt.orderId) !== String(order._id)
        )
          paymentError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "Chiave già usata per un pagamento diverso.",
          );
        const attempt = await tx.internal.paymentAttempts
          .findOne({
            shopId: tx.shopId,
            _id: receipt.paymentAttemptId,
            orderId: order._id,
            accountId: p.accountId,
          })
          .session(tx.session)
          .lean();
        if (!attempt)
          paymentError(
            503,
            "PAYMENT_UNAVAILABLE",
            "Pagamento non disponibile.",
          );
        assertPaymentScope(attempt, config!);
        return {
          status: customerStatus(order, attempt, null),
          attemptId: attempt!.publicId as string,
        };
      }
      if (order.revision !== expectedRevision)
        paymentError(
          409,
          "ORDER_CHANGED",
          "Ordine modificato. Aggiorna il riepilogo.",
        );
      if (!config!.enabled)
        paymentError(
          503,
          "PAYMENTS_DISABLED",
          "I nuovi pagamenti non sono disponibili.",
        );
      if (
        !["open", "in_progress"].includes(order.operationalStatus) ||
        !["awaiting", "processing", "failed", "expired"].includes(
          order.paymentStatus,
        )
      )
        paymentError(
          409,
          "ORDER_NOT_PAYABLE",
          "Questo ordine non ammette un nuovo pagamento.",
        );
      if (
        order.totals.currency !== "EUR" ||
        order.totals.grossMinor < 50 ||
        order.totals.grossMinor > 99999999
      )
        paymentError(
          400,
          "PAYMENT_AMOUNT_INVALID",
          "Importo non supportato dal pagamento online.",
        );
      let attempt = await tx.internal.paymentAttempts
        .findOne({ shopId: tx.shopId, orderId: order._id, active: true })
        .session(tx.session)
        .lean();
      if (attempt) assertPaymentScope(attempt, config!);
      else {
        const record = await new tx.internal.paymentAttempts({
          shopId: tx.shopId,
          publicId: randomUUID(),
          orderId: order._id,
          accountId: p.accountId,
          ...paymentScope(config!),
          amountMinor: order.totals.grossMinor,
          currency: "EUR",
          state: "creating",
          active: true,
          providerIdempotencyKey: `commerce-checkout-${tx.shopId}-${randomUUID()}`,
          orderHash: orderPaymentHash(order),
          checkoutSpec: {
            returnOrigin: config!.returnOrigin,
            methods: config!.methods,
            apiVersion: STRIPE_API_VERSION,
          },
          creationDeadline: new Date(Date.now() + 20 * 3600000),
          nextReconcileAt: new Date(),
          cancellationRequested: false,
        }).save({ session: tx.session });
        attempt = record.toObject();
        await appendCommerceAudit(tx, {
          action: "payment.requested",
          objectType: "order",
          objectId: order.publicId,
          outcome: "accepted",
        });
      }
      await new tx.internal.paymentRequests({
        shopId: tx.shopId,
        accountId: p.accountId,
        orderId: order._id,
        paymentAttemptId: attempt!._id,
        keyHash,
        requestHash,
      }).save({ session: tx.session });
      return {
        status: customerStatus(order, attempt, null),
        attemptId: attempt!.publicId as string,
      };
    },
  );
  if (!prepared.attemptId || !config) return prepared.status;
  const observed = await reconcileAttempt(prepared.attemptId);
  return withAtlasCommerceTransaction(
    { kind: "customer", id: p.accountId, requestId },
    async (tx) => {
      // Recheck revocation after the external API hop; never replay the public first phase.
      await lockCheckoutPrincipal(tx, proof, true);
      const order = await lockPaymentOrder(tx, {
          publicId: orderPublicId,
          accountId: p.accountId,
        }),
        attempt = await tx.internal.paymentAttempts
          .findOne({
            shopId: tx.shopId,
            publicId: prepared.attemptId,
            orderId: order._id,
            accountId: p.accountId,
          })
          .session(tx.session)
          .lean();
      const url =
        config.enabled &&
        attempt?.active &&
        attempt.state === "ready" &&
        !attempt.cancellationRequested &&
        ["open", "in_progress"].includes(order.operationalStatus) &&
        ["awaiting", "processing"].includes(order.paymentStatus) &&
        observed?.session?.status === "open" &&
        observed.session.id === attempt.providerSessionId &&
        observed.session.url
          ? checkoutUrl(observed.session.url)
          : null;
      return customerStatus(order, attempt, url);
    },
  );
}
