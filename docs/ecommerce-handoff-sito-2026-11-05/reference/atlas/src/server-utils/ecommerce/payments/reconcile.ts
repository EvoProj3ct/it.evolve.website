import "server-only";
import { commercePayloadHash } from "@evolve/ecommerce-server/assertions";
import {
  getAtlasCommerceStorage,
  withAtlasCommerceTransaction,
} from "../persistence/atlas-storage";
import { appendCommerceAudit } from "../persistence/core-adapters";
import {
  assertPaymentScope,
  checkoutUrl,
  paymentConfig,
  paymentError,
  PaymentReviewError,
  STRIPE_API_VERSION,
  stripeId,
} from "./config";
import {
  checkoutParameters,
  inspectCheckout,
  stripeGateway,
  validateCheckout,
  type CheckoutObservation,
} from "./stripe";
import {
  claimPaymentWork,
  lockPaymentOrder,
  orderPaymentHash,
  providerActor,
  updatePaymentOrder,
  workFilter,
  type PaymentTx,
} from "./repository";
import { postPayment, postRefund } from "./core-ledger";
export async function recordPaymentReview(
  claimed: any,
  code: string,
  observed?: CheckoutObservation,
) {
  return withAtlasCommerceTransaction(
    providerActor(claimed.merchantId),
    async (tx) => {
      const order = await lockPaymentOrder(tx, { _id: claimed.orderId }),
        row = await tx.internal.paymentAttempts
          .findOne(workFilter(tx.shopId, claimed))
          .session(tx.session)
          .lean();
      if (!row) return;
      const trusted =
        observed?.session?.id === claimed.providerSessionId ||
        (!claimed.providerSessionId &&
          observed?.session?.metadata?.attempt_id === claimed.publicId);
      const changed = await tx.internal.paymentAttempts.updateOne(
        workFilter(tx.shopId, claimed),
        {
          $set: {
            state: "under_review",
            reviewCode: code,
            lastErrorCode: code,
            nextReconcileAt: new Date(Date.now() + 3600000),
            ...(trusted && observed
              ? {
                  providerSessionId: observed.session.id,
                  ...(observed.intent
                    ? { providerPaymentId: observed.intent.id }
                    : {}),
                  ...(observed.charge
                    ? { providerChargeId: observed.charge.id }
                    : {}),
                  ...(observed.session.payment_status === "paid" &&
                  observed.charge
                    ? {
                        verifiedPaidAt: new Date(
                          observed.charge.created * 1000,
                        ),
                      }
                    : {}),
                }
              : {}),
          },
          $unset: { workLease: 1 },
          $inc: { revision: 1 },
        },
        { session: tx.session },
      );
      if (changed.matchedCount !== 1)
        paymentError(409, "PAYMENT_LEASE_LOST", "Riconciliazione da ripetere.");
      if (
        order.paymentStatus !== "under_review" ||
        !order.paymentSummary?.requiresReview
      )
        await updatePaymentOrder(tx, order, {
          paymentStatus: "under_review",
          paymentSummary: {
            paidMinor: order.paymentSummary?.paidMinor || 0,
            refundedMinor: order.paymentSummary?.refundedMinor || 0,
            ...(order.paymentSummary?.paidAt
              ? { paidAt: order.paymentSummary.paidAt }
              : {}),
            ...(order.paymentSummary?.method
              ? { method: order.paymentSummary.method }
              : {}),
            requiresReview: true,
          },
        });
      await appendCommerceAudit(tx, {
        action: "payment.review_required",
        objectType: "order",
        objectId: order.publicId,
        outcome: "rejected",
        reasonCode: code,
      });
    },
  );
}
async function applyObservation(
  tx: PaymentTx,
  claimed: any,
  observed: CheckoutObservation,
) {
  const order = await lockPaymentOrder(tx, { _id: claimed.orderId }),
    attempt = await tx.internal.paymentAttempts
      .findOne(workFilter(tx.shopId, claimed))
      .session(tx.session)
      .lean();
  if (!attempt)
    paymentError(409, "PAYMENT_LEASE_LOST", "Riconciliazione già in corso.");
  if (
    attempt!.orderHash !== orderPaymentHash(order) ||
    attempt!.amountMinor !== order.totals.grossMinor
  )
    throw new PaymentReviewError("ORDER_PAYMENT_MISMATCH");
  const fact = validateCheckout(tx.shopId, order, attempt, observed),
    { session: s, intent: pi, charge } = observed,
    scope = {
      provider: attempt!.provider,
      merchantId: attempt!.merchantId,
      mode: attempt!.mode,
    };
  const existingReceipt = await tx.internal.paymentReceipts
    .findOne({ shopId: tx.shopId, orderId: order._id })
    .session(tx.session)
    .lean();
  if (
    existingReceipt &&
    String(existingReceipt.paymentAttemptId) !== String(attempt!._id) &&
    fact.paid &&
    fact.refunded === attempt!.amountMinor &&
    !fact.pendingRefund &&
    !fact.disputed
  ) {
    const resolved = await tx.internal.paymentAttempts.updateOne(
      workFilter(tx.shopId, claimed),
      {
        $set: {
          state: "paid",
          active: false,
          providerSessionId: s.id,
          providerPaymentId: pi.id,
          providerChargeId: charge.id,
          verifiedPaidAt: new Date(charge.created * 1000),
          refundedMinor: fact.refunded,
          nextReconcileAt: new Date(Date.now() + 86400000),
        },
        $unset: { workLease: 1, reviewCode: 1, lastErrorCode: 1 },
        $inc: { revision: 1 },
      },
      { session: tx.session },
    );
    if (resolved.matchedCount !== 1)
      paymentError(409, "PAYMENT_LEASE_LOST", "Riconciliazione da ripetere.");
    await tx.internal.paymentAttempts.updateOne(
      { shopId: tx.shopId, _id: existingReceipt.paymentAttemptId },
      { $set: { nextReconcileAt: new Date() }, $inc: { revision: 1 } },
      { session: tx.session },
    );
    if (attempt!.reviewCode)
      await appendCommerceAudit(tx, {
        action: "payment.duplicate_returned",
        objectType: "order",
        objectId: order.publicId,
        outcome: "succeeded",
      });
    return;
  }
  if (
    existingReceipt &&
    String(existingReceipt.paymentAttemptId) !== String(attempt!._id) &&
    !fact.paid
  ) {
    // An older unpaid/expired attempt must never downgrade a later successful payment.
    const changed = await tx.internal.paymentAttempts.updateOne(
      workFilter(tx.shopId, claimed),
      {
        $set: {
          state: s.status === "expired" ? "expired" : "under_review",
          active: s.status !== "expired",
          providerSessionId: s.id,
          nextReconcileAt: new Date(Date.now() + 86400000),
        },
        $unset: {
          workLease: 1,
          ...(s.status === "expired"
            ? { reviewCode: 1, lastErrorCode: 1 }
            : {}),
        },
        $inc: { revision: 1 },
      },
      { session: tx.session },
    );
    if (changed.matchedCount !== 1)
      paymentError(409, "PAYMENT_LEASE_LOST", "Riconciliazione da ripetere.");
    return;
  }
  let state = "ready",
    active = true,
    status = "awaiting",
    paidAt: Date | undefined,
    refundedMinor = 0,
    pending = false,
    reviewCode: string | undefined;
  if (
    existingReceipt &&
    (!fact.paid || existingReceipt.providerPaymentId !== pi?.id)
  )
    throw new PaymentReviewError(
      fact.paid ? "MULTIPLE_PAYMENTS" : "PROVIDER_PAYMENT_REGRESSION",
    );
  if (fact.paid) {
    state = "paid";
    active = false;
    paidAt = existingReceipt
      ? new Date(existingReceipt.paidAt)
      : new Date(charge.created * 1000);
    const revenueId = await postPayment(tx, order, paidAt, existingReceipt);
    if (!existingReceipt) {
      await new tx.internal.paymentReceipts({
        shopId: tx.shopId,
        ...scope,
        orderId: order._id,
        paymentAttemptId: attempt!._id,
        revenueId,
        providerPaymentId: pi.id,
        providerChargeId: charge.id,
        amountMinor: attempt!.amountMinor,
        currency: "EUR",
        paidAt,
      }).save({ session: tx.session });
      await appendCommerceAudit(tx, {
        action: "payment.received",
        objectType: "order",
        objectId: order.publicId,
        outcome: "succeeded",
      });
      await new tx.internal.outbox({
        shopId: tx.shopId,
        kind: "payment_receipt",
        aggregateId: order._id,
        aggregateRevision: order.revision,
        deduplicationKey: commercePayloadHash([
          tx.shopId,
          "payment_receipt",
          attempt!.publicId,
        ]),
        availableAt: new Date(),
      }).save({ session: tx.session });
    }
    const known = await tx.internal.refundReceipts
      .find({ shopId: tx.shopId, orderId: order._id })
      .session(tx.session)
      .lean();
    for (const previous of known)
      if (
        !observed.refunds.some(
          (refund) =>
            refund.id === previous.providerRefundId &&
            refund.status === "succeeded" &&
            refund.amount === previous.amountMinor,
        )
      )
        throw new PaymentReviewError("REFUND_HISTORY_REGRESSION");
    refundedMinor = known.reduce(
      (sum: number, entry: any) => sum + entry.amountMinor,
      0,
    );
    let netMinor = known.reduce(
      (sum: number, entry: any) => sum + entry.netMinor,
      0,
    );
    const newRefunds = observed.refunds
      .filter(
        (refund) =>
          refund.status === "succeeded" &&
          !known.some((entry: any) => entry.providerRefundId === refund.id),
      )
      .sort((a, b) => a.created - b.created || a.id.localeCompare(b.id));
    // Bounded posting transactions; remaining verified refunds are picked up immediately.
    for (const refund of newRefunds.slice(0, 20)) {
      const confirmedAt = new Date(),
        adjustment = await postRefund(
          tx,
          order,
          { ...refund, ...scope },
          confirmedAt,
          refundedMinor,
          netMinor,
        );
      await new tx.internal.refundReceipts({
        shopId: tx.shopId,
        ...scope,
        orderId: order._id,
        paymentAttemptId: attempt!._id,
        providerRefundId: refund.id,
        amountMinor: refund.amount,
        netMinor: adjustment.netMinor,
        taxMinor: adjustment.taxMinor,
        adjustmentRevenueId: adjustment.adjustmentRevenueId,
        currency: "EUR",
        confirmedAt,
      }).save({ session: tx.session });
      refundedMinor += refund.amount;
      netMinor += adjustment.netMinor;
      await appendCommerceAudit(tx, {
        action: "refund.posted",
        objectType: "order",
        objectId: order.publicId,
        outcome: "succeeded",
      });
    }
    const postedIds = [
      ...known.map((entry: any) => entry.providerRefundId),
      ...newRefunds.slice(0, 20).map((refund) => refund.id),
    ];
    for (const refund of observed.refunds) {
      const localState =
        refund.status === "succeeded"
          ? postedIds.includes(refund.id)
            ? "succeeded"
            : "processing"
          : refund.status === "failed"
            ? "failed"
            : refund.status === "canceled"
              ? "cancelled"
              : "processing";
      await tx.internal.refunds.updateMany(
        {
          shopId: tx.shopId,
          ...scope,
          orderId: order._id,
          providerRefundId: refund.id,
        },
        {
          $set: {
            state: localState,
            nextReconcileAt: new Date(Date.now() + 3600000),
          },
          $inc: { revision: 1 },
        },
        { session: tx.session },
      );
    }
    const localPending = await tx.internal.refunds
      .exists({
        shopId: tx.shopId,
        orderId: order._id,
        state: { $in: ["requested", "processing", "under_review"] },
      })
      .session(tx.session);
    const refundReview = await tx.internal.refunds
      .exists({ shopId: tx.shopId, orderId: order._id, state: "under_review" })
      .session(tx.session);
    pending = fact.pendingRefund || !!localPending || newRefunds.length > 20;
    const late =
      order.operationalStatus === "cancelled" &&
      refundedMinor < attempt!.amountMinor;
    reviewCode = late
      ? "LATE_PAYMENT_CANCELLED_ORDER"
      : refundReview
        ? "REFUND_REVIEW_REQUIRED"
        : undefined;
    status = fact.disputed
      ? "disputed"
      : late || refundReview
        ? "under_review"
        : refundedMinor === attempt!.amountMinor
          ? "refunded"
          : pending
            ? "refund_pending"
            : refundedMinor > 0
              ? "partially_refunded"
              : "paid";
    if (newRefunds.length > 20) pending = true;
  } else {
    if (pi?.status === "succeeded")
      throw new PaymentReviewError("CAPTURE_NOT_LINKED");
    if (
      s.status === "complete" &&
      pi &&
      ["canceled", "requires_payment_method"].includes(pi.status)
    ) {
      state = "failed";
      active = false;
      status = "failed";
    } else if (
      s.status === "expired" &&
      (!pi || ["canceled", "requires_payment_method"].includes(pi.status))
    ) {
      state =
        attempt!.cancellationRequested ||
        order.operationalStatus === "cancelled"
          ? "cancelled"
          : "expired";
      active = false;
      status = "expired";
    } else if (
      s.status === "complete" ||
      pi?.status === "processing" ||
      s.status === "expired"
    ) {
      state = "processing";
      status = "processing";
    }
    if (
      s.status === "open" &&
      (attempt!.cancellationRequested ||
        order.operationalStatus === "cancelled")
    ) {
      state = "processing";
      status = "awaiting";
    }
  }
  const otherReview = await tx.internal.paymentAttempts
    .exists({
      shopId: tx.shopId,
      orderId: order._id,
      _id: { $ne: attempt!._id },
      state: "under_review",
    })
    .session(tx.session);
  if (otherReview) {
    status = "under_review";
    reviewCode ||= "OTHER_ATTEMPT_REVIEW";
  }
  const paymentSummary = {
    paidMinor: fact.paid ? attempt!.amountMinor : 0,
    refundedMinor,
    ...(paidAt ? { paidAt } : {}),
    ...(fact.paid ? { method: fact.method } : {}),
    requiresReview: !!reviewCode || status === "disputed",
  };
  if (
    order.paymentStatus !== status ||
    commercePayloadHash(order.paymentSummary || null) !==
      commercePayloadHash(paymentSummary)
  )
    await updatePaymentOrder(tx, order, {
      paymentStatus: status,
      paymentSummary,
    });
  const changed = await tx.internal.paymentAttempts.updateOne(
    workFilter(tx.shopId, claimed),
    {
      $set: {
        providerSessionId: s.id,
        ...(pi ? { providerPaymentId: pi.id } : {}),
        ...(charge ? { providerChargeId: charge.id } : {}),
        state,
        active,
        ...(s.expires_at ? { expiresAt: new Date(s.expires_at * 1000) } : {}),
        ...(paidAt
          ? { paidAt, verifiedPaidAt: paidAt, method: fact.method }
          : {}),
        refundedMinor,
        ...(reviewCode ? { reviewCode } : {}),
        nextReconcileAt: new Date(
          Date.now() + (pending ? 30000 : active ? 300000 : 86400000),
        ),
      },
      $unset: {
        workLease: 1,
        lastErrorCode: 1,
        ...(!reviewCode ? { reviewCode: 1 } : {}),
      },
      $inc: { revision: 1 },
    },
    { session: tx.session },
  );
  if (changed.matchedCount !== 1)
    paymentError(409, "PAYMENT_LEASE_LOST", "Riconciliazione da ripetere.");
}
export async function reconcileAttempt(
  id: string,
  recoveredSessionId?: string,
) {
  const claimed = await claimPaymentWork("paymentAttempts", id);
  if (!claimed)
    paymentError(
      409,
      "PAYMENT_BUSY",
      "Riconciliazione già in corso. Riprova tra poco.",
    );
  const storage = await getAtlasCommerceStorage();
  let observation: CheckoutObservation | undefined,
    validated = false;
  try {
    const config = paymentConfig();
    assertPaymentScope(claimed, config);
    const order = await storage.internal.orders
      .findOne({ shopId: process.env.ECOMMERCE_SHOP_ID, _id: claimed.orderId })
      .lean();
    if (
      !order ||
      !claimed.checkoutSpec ||
      !claimed.orderHash ||
      claimed.orderHash !== orderPaymentHash(order) ||
      claimed.checkoutSpec.apiVersion !== STRIPE_API_VERSION
    )
      throw new PaymentReviewError("ATTEMPT_CONFIGURATION_MISSING");
    if (
      claimed.checkoutSpec.returnOrigin !== config.returnOrigin &&
      !claimed.cancellationRequested
    )
      throw new PaymentReviewError("RETURN_ORIGIN_CHANGED");
    const client = await stripeGateway(config);
    let sessionId = claimed.providerSessionId || recoveredSessionId;
    if (
      recoveredSessionId &&
      claimed.providerSessionId &&
      recoveredSessionId !== claimed.providerSessionId
    )
      throw new PaymentReviewError("PROVIDER_REFERENCE_MISMATCH");
    if (!sessionId) {
      // A never-started creation can be cancelled without touching Stripe.
      if (
        !claimed.creationStartedAt &&
        (claimed.cancellationRequested ||
          order.operationalStatus === "cancelled")
      ) {
        await withAtlasCommerceTransaction(
          providerActor(config.merchantId),
          async (tx) => {
            const locked = await lockPaymentOrder(tx, { _id: claimed.orderId });
            const result = await tx.internal.paymentAttempts.updateOne(
              {
                ...workFilter(tx.shopId, claimed),
                creationStartedAt: { $exists: false },
              },
              {
                $set: {
                  state: "cancelled",
                  active: false,
                  nextReconcileAt: new Date(Date.now() + 86400000),
                },
                $unset: { workLease: 1 },
                $inc: { revision: 1 },
              },
              { session: tx.session },
            );
            if (result.matchedCount !== 1)
              paymentError(
                409,
                "PAYMENT_LEASE_LOST",
                "Riconciliazione già in corso.",
              );
            const paid = await tx.internal.paymentReceipts
              .exists({ shopId: tx.shopId, orderId: locked._id })
              .session(tx.session);
            const otherReview = await tx.internal.paymentAttempts
              .exists({
                shopId: tx.shopId,
                orderId: locked._id,
                _id: { $ne: claimed._id },
                state: "under_review",
              })
              .session(tx.session);
            if (!paid && !otherReview && locked.paymentStatus !== "expired")
              await updatePaymentOrder(tx, locked, {
                paymentStatus: "expired",
              });
          },
        );
        return null;
      }
      if (!claimed.creationDeadline || claimed.creationDeadline <= new Date())
        throw new PaymentReviewError("CREATION_RECOVERY_REQUIRED");
      if (!claimed.creationStartedAt) {
        const started = await storage.internal.paymentAttempts.updateOne(
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
      const created = await client.checkout.sessions.create(
        checkoutParameters(process.env.ECOMMERCE_SHOP_ID!, order, claimed),
        { idempotencyKey: claimed.providerIdempotencyKey },
      );
      sessionId = created.id;
    }
    stripeId(sessionId, "cs");
    observation = await inspectCheckout(client, sessionId);
    validateCheckout(
      process.env.ECOMMERCE_SHOP_ID!,
      order,
      claimed,
      observation,
    );
    validated = true;
    // Validate before expiring an object supplied for manual recovery.
    const fresh = await storage.internal.paymentAttempts
        .findOne({ shopId: process.env.ECOMMERCE_SHOP_ID, _id: claimed._id })
        .lean(),
      freshOrder = await storage.internal.orders
        .findOne({
          shopId: process.env.ECOMMERCE_SHOP_ID,
          _id: claimed.orderId,
        })
        .select({ operationalStatus: 1 })
        .lean(),
      anotherPayment = await storage.internal.paymentReceipts.exists({
        shopId: process.env.ECOMMERCE_SHOP_ID,
        orderId: claimed.orderId,
        paymentAttemptId: { $ne: claimed._id },
      });
    if (
      (!config.enabled ||
        fresh?.cancellationRequested ||
        freshOrder?.operationalStatus === "cancelled" ||
        anotherPayment) &&
      observation.session.status === "open"
    ) {
      await client.checkout.sessions.expire(
        sessionId,
        {},
        { idempotencyKey: `expire-${claimed.publicId}` },
      );
      observation = await inspectCheckout(client, sessionId);
    }
    if (observation.session.status === "open" && observation.session.url)
      checkoutUrl(observation.session.url);
    await withAtlasCommerceTransaction(providerActor(config.merchantId), (tx) =>
      applyObservation(tx, claimed, observation!),
    );
    return observation;
  } catch (error) {
    if (error instanceof PaymentReviewError) {
      await recordPaymentReview(
        claimed,
        error.code,
        validated ? observation : undefined,
      );
      return null;
    }
    await storage.internal.paymentAttempts
      .updateOne(workFilter(process.env.ECOMMERCE_SHOP_ID!, claimed), {
        $set: {
          lastErrorCode: "STRIPE_UNAVAILABLE",
          nextReconcileAt: new Date(Date.now() + 300000),
        },
        $unset: { workLease: 1 },
        $inc: { revision: 1 },
      })
      .catch(() => undefined);
    throw error;
  }
}
