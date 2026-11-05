import "server-only";
import Stripe from "stripe";
import {
  STRIPE_API_VERSION,
  paymentConfig,
  PaymentReviewError,
  objectReference,
  stripeId,
  type PaymentConfig,
} from "./config";
const clients = new Map<string, { client: Stripe; identity?: Promise<void> }>();
/** No provider calls or env reads at import time. No Connect override or caller-selected host. */
export async function stripeGateway(config: PaymentConfig = paymentConfig()) {
  let cached = clients.get(config.signature);
  if (!cached) {
    cached = {
      client: new Stripe(config.secret, {
        apiVersion: STRIPE_API_VERSION,
        timeout: 8000,
        maxNetworkRetries: 0,
      }),
    };
    clients.set(config.signature, cached);
  }
  const entry = cached;
  if (!entry.identity)
    entry.identity = entry.client.accounts
      .retrieveCurrent()
      .then((account) => {
        if (account.id !== config.merchantId)
          throw new PaymentReviewError("MERCHANT_MISMATCH");
      })
      .catch((error) => {
        entry.identity = undefined;
        throw error;
      });
  await entry.identity;
  return entry.client;
}
export function webhookClient(config: PaymentConfig) {
  // Signature verification is local. Do not make an API call before durable webhook ingestion.
  return new Stripe(config.secret, {
    apiVersion: STRIPE_API_VERSION,
    timeout: 8000,
    maxNetworkRetries: 0,
  });
}
export function checkoutMetadata(shopId: string, order: any, attempt: any) {
  return {
    shop_id: shopId,
    order_id: order.publicId,
    attempt_id: attempt.publicId,
    order_hash: attempt.orderHash,
  };
}
export function checkoutParameters(
  shopId: string,
  order: any,
  attempt: any,
): NonNullable<Parameters<Stripe["checkout"]["sessions"]["create"]>[0]> {
  const metadata = checkoutMetadata(shopId, order, attempt),
    base = attempt.checkoutSpec.returnOrigin;
  return {
    mode: "payment",
    ui_mode: "hosted_page",
    client_reference_id: order.publicId,
    metadata,
    customer_email: order.billing.email,
    customer_creation: "if_required",
    payment_method_types: attempt.checkoutSpec.methods,
    payment_intent_data: { capture_method: "automatic", metadata },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: order.totals.grossMinor,
          product_data: {
            name: `Ordine ${order.number}`,
            description:
              "Totale dell’ordine, IVA ed eventuale consegna incluse.",
          },
        },
      },
    ],
    success_url: `${base}/account/ordini/${order.publicId}?pagamento=ritorno`,
    cancel_url: `${base}/account/ordini/${order.publicId}?pagamento=interrotto`,
    automatic_tax: { enabled: false },
    adaptive_pricing: { enabled: false },
    allow_promotion_codes: false,
    invoice_creation: { enabled: false },
    locale: "it",
  };
}
async function allRefunds(client: Stripe, paymentIntentId: string) {
  const values: any[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const result = await client.refunds.list({
      payment_intent: paymentIntentId,
      limit: 100,
      ...(cursor ? { starting_after: cursor } : {}),
    });
    values.push(...result.data);
    if (!result.has_more) return values;
    if (!result.data.length) break;
    cursor = result.data.at(-1)!.id;
  }
  throw new PaymentReviewError("REFUND_HISTORY_LIMIT");
}
export async function inspectCheckout(client: Stripe, sessionId: string) {
  stripeId(sessionId, "cs");
  const session: any = await client.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent.latest_charge"],
  });
  const intent: any =
    typeof session.payment_intent === "object"
      ? session.payment_intent
      : session.payment_intent
        ? await client.paymentIntents.retrieve(session.payment_intent, {
            expand: ["latest_charge"],
          })
        : null;
  const charge: any = intent?.latest_charge
    ? typeof intent.latest_charge === "object"
      ? intent.latest_charge
      : await client.charges.retrieve(intent.latest_charge)
    : null;
  const refunds = intent ? await allRefunds(client, intent.id) : [];
  const disputes = charge
    ? await client.disputes.list({ charge: charge.id, limit: 100 })
    : null;
  if (disputes?.has_more) throw new PaymentReviewError("DISPUTE_HISTORY_LIMIT");
  return { session, intent, charge, refunds, disputes: disputes?.data || [] };
}
export type CheckoutObservation = Awaited<ReturnType<typeof inspectCheckout>>;
export function validateCheckout(
  shopId: string,
  order: any,
  attempt: any,
  observed: CheckoutObservation,
) {
  const { session: s, intent: pi, charge } = observed,
    expected = checkoutMetadata(shopId, order, attempt);
  const metadataMatches = (value: any) =>
    Object.entries(expected).every(([key, entry]) => value?.[key] === entry);
  if (
    s.object !== "checkout.session" ||
    (attempt.providerSessionId && s.id !== attempt.providerSessionId) ||
    s.livemode !== (attempt.mode === "live") ||
    s.mode !== "payment" ||
    s.ui_mode !== "hosted_page" ||
    !Array.isArray(s.payment_method_types) ||
    s.payment_method_types.length !== attempt.checkoutSpec.methods.length ||
    s.payment_method_types.some(
      (method: string) => !attempt.checkoutSpec.methods.includes(method),
    ) ||
    s.client_reference_id !== order.publicId ||
    !metadataMatches(s.metadata) ||
    s.currency !== "eur" ||
    s.amount_total !== attempt.amountMinor ||
    s.amount_subtotal !== attempt.amountMinor ||
    s.subscription ||
    s.invoice ||
    s.total_details?.amount_discount !== 0 ||
    s.total_details?.amount_shipping !== 0 ||
    s.total_details?.amount_tax !== 0 ||
    !["open", "complete", "expired"].includes(s.status) ||
    !["unpaid", "paid"].includes(s.payment_status) ||
    (pi &&
      (pi.object !== "payment_intent" ||
        pi.livemode !== (attempt.mode === "live") ||
        !metadataMatches(pi.metadata) ||
        pi.currency !== "eur" ||
        pi.amount !== attempt.amountMinor ||
        !["automatic", "automatic_async"].includes(pi.capture_method) ||
        (attempt.providerPaymentId && pi.id !== attempt.providerPaymentId)))
  )
    throw new PaymentReviewError("CHECKOUT_MISMATCH");
  if (
    charge &&
    (charge.object !== "charge" ||
      charge.livemode !== (attempt.mode === "live") ||
      objectReference(charge.payment_intent) !== pi.id ||
      charge.currency !== "eur" ||
      charge.amount !== attempt.amountMinor)
  )
    throw new PaymentReviewError("CHARGE_MISMATCH");
  if (
    s.payment_status === "paid" &&
    (!pi ||
      pi.status !== "succeeded" ||
      pi.amount_received !== attempt.amountMinor ||
      !charge ||
      !charge.paid ||
      !charge.captured ||
      charge.amount_captured !== attempt.amountMinor)
  )
    throw new PaymentReviewError("CAPTURE_NOT_CONFIRMED");
  if (
    s.payment_status === "paid" &&
    !attempt.checkoutSpec.methods.includes(charge?.payment_method_details?.type)
  )
    throw new PaymentReviewError("PAYMENT_METHOD_MISMATCH");
  for (const refund of observed.refunds) {
    if (
      refund.object !== "refund" ||
      objectReference(refund.payment_intent) !== pi?.id ||
      objectReference(refund.charge) !== charge?.id ||
      refund.currency !== "eur" ||
      !Number.isSafeInteger(refund.amount) ||
      refund.amount < 1 ||
      refund.amount > attempt.amountMinor ||
      ![
        "pending",
        "requires_action",
        "succeeded",
        "failed",
        "canceled",
      ].includes(refund.status)
    )
      throw new PaymentReviewError("REFUND_MISMATCH");
  }
  const refunded = observed.refunds
    .filter((refund) => refund.status === "succeeded")
    .reduce((sum, refund) => sum + refund.amount, 0);
  if (!Number.isSafeInteger(refunded) || refunded > attempt.amountMinor)
    throw new PaymentReviewError("REFUND_AMOUNT_MISMATCH");
  for (const dispute of observed.disputes)
    if (
      objectReference(dispute.charge) !== charge?.id ||
      dispute.currency !== "eur" ||
      dispute.livemode !== (attempt.mode === "live")
    )
      throw new PaymentReviewError("DISPUTE_MISMATCH");
  return {
    paid: s.payment_status === "paid",
    refunded,
    pendingRefund: observed.refunds.some((refund) =>
      ["pending", "requires_action"].includes(refund.status),
    ),
    disputed: observed.disputes.some(
      (dispute) => !["won", "warning_closed"].includes(dispute.status),
    ),
    method:
      charge?.payment_method_details?.type === "card"
        ? ["apple_pay", "google_pay"].includes(
            charge.payment_method_details.card?.wallet?.type,
          )
          ? charge.payment_method_details.card.wallet.type
          : "card"
        : charge?.payment_method_details?.type === "paypal"
          ? "paypal"
          : "unknown",
  };
}
