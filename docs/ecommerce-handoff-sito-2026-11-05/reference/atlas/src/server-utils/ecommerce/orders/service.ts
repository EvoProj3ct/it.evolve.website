import "server-only";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { commercePayloadHash } from "@evolve/ecommerce-server/assertions";
import {
  validateLineSnapshots,
  replaceCommerceRecord,
  type CommerceActor,
} from "@evolve/ecommerce-server/persistence";
import {
  getAtlasCommerceStorage,
  withAtlasCommerceTransaction,
  type AtlasCommerceTransaction,
} from "../persistence/atlas-storage";
import {
  appendCommerceAudit,
  insertProgrammedCommerceRevenue,
} from "../persistence/core-adapters";
import { withLinkedCommerceCustomer } from "../customers/service";
import { lockCheckoutPrincipal } from "../checkout/auth";
import { requireQuoteCurrent, type CheckoutProof } from "../checkout/service";
import { lockPolicy } from "../checkout/policy";
import {
  checkoutError,
  objectWithKeys,
  parsePrincipal,
  publicId,
} from "../checkout/validation";
import type {
  CommerceOrder,
  CommerceOrderSummary,
  StaffOrderDetails,
} from "./types";
type Tx = AtlasCommerceTransaction;
function summary(order: any): CommerceOrderSummary {
  return {
    id: order.publicId,
    number: order.number,
    revision: order.revision,
    placedAt: order.placedAt.toISOString(),
    operationalStatus: order.operationalStatus,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    totals: { ...order.totals },
    ...(order.paymentSummary
      ? {
          payment: {
            paidMinor: order.paymentSummary.paidMinor,
            refundedMinor: order.paymentSummary.refundedMinor,
            ...(order.paymentSummary.paidAt
              ? { paidAt: new Date(order.paymentSummary.paidAt).toISOString() }
              : {}),
            ...(order.paymentSummary.method
              ? { method: order.paymentSummary.method }
              : {}),
            requiresReview: order.paymentSummary.requiresReview,
          },
        }
      : {}),
  };
}
/** Positive projection shared by staff and personal APIs. No core IDs, notes, mappings or actor. */
export function orderForCustomer(order: any): CommerceOrder {
  const address = (value: any) => ({
    name: value.name,
    line1: value.line1,
    ...(value.line2 ? { line2: value.line2 } : {}),
    city: value.city,
    postalCode: value.postalCode,
    ...(value.region ? { region: value.region } : {}),
    country: value.country,
  });
  return {
    ...summary(order),
    lines: order.lines.map((line: any) => ({
      lineId: line.lineId,
      productPublicId: line.productPublicId,
      listingRevision: line.listingRevision,
      title: line.title,
      code: line.code,
      kind: line.kind,
      quantity: line.quantity,
      price: { ...line.price },
      totals: { ...line.totals },
    })),
    billing: {
      kind: order.billing.kind,
      name: order.billing.name,
      email: order.billing.email,
      ...Object.fromEntries(
        ["taxCode", "vatNumber", "recipientCode", "certifiedEmail"]
          .filter((key) => order.billing[key])
          .map((key) => [key, order.billing[key]]),
      ),
      address: address(order.billing.address),
    },
    ...(order.shipping ? { shipping: address(order.shipping) } : {}),
    fulfillmentSelections: (order.fulfillmentSelections || []).map(
      (item: any) => ({
        optionPublicId: item.optionPublicId,
        mode: item.mode,
        label: item.label,
        details: item.details || "",
        price: { ...item.price },
      }),
    ),
    fulfillment: order.fulfillment.map((item: any) => ({
      lineId: item.lineId,
      state: item.state,
      fulfilledQuantity: item.fulfilledQuantity,
      shippedQuantity: item.shippedQuantity,
    })),
    termsVersion: order.termsVersion,
  };
}
function parsePlacement(value: unknown) {
  const input = objectWithKeys(value, [
    "principal",
    "quotePublicId",
    "idempotencyKey",
  ]);
  return {
    quotePublicId: publicId(input.quotePublicId),
    idempotencyKey: publicId(input.idempotencyKey),
  };
}
function revenueMapping(quote: any, policy: any) {
  const mapping = new Map<string, any>();
  for (const entry of quote.accounting || []) {
    if (
      mapping.has(entry.lineId) ||
      ![
        "stampa3d",
        "consulenza",
        "sviluppoSoftware",
        "atlas",
        "altro",
      ].includes(entry.category) ||
      typeof entry.variant !== "string" ||
      !entry.variant.trim() ||
      entry.variant.length > 100
    )
      checkoutError(
        409,
        "QUOTE_EXPIRED_OR_CHANGED",
        "Richiedi un nuovo riepilogo.",
      );
    mapping.set(entry.lineId, entry);
  }
  if (
    mapping.size !== quote.lines.length ||
    quote.lines.some((line: any) => !mapping.has(line.lineId))
  )
    checkoutError(
      409,
      "QUOTE_EXPIRED_OR_CHANGED",
      "Richiedi un nuovo riepilogo.",
    );
  const entries = [...mapping.values()],
    first = entries[0];
  if (
    first &&
    entries.every(
      (entry) =>
        entry.category === first.category && entry.variant === first.variant,
    )
  )
    return { category: first.category, variant: first.variant };
  if (!policy.mixedRevenue)
    checkoutError(
      503,
      "REVENUE_MAPPING_REQUIRED",
      "Gli ordini con categorie diverse non sono ancora disponibili. Contatta l’assistenza.",
    );
  return {
    category: policy.mixedRevenue.category,
    variant: policy.mixedRevenue.variant,
  };
}
async function nextNumber(tx: Tx, date: Date) {
  const year = date.getUTCFullYear(),
    key = `order_number:${year}`;
  const counter = await tx.internal.counters
    .findOneAndUpdate(
      { shopId: tx.shopId, key },
      { $inc: { value: 1, revision: 1 } },
      {
        session: tx.session,
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    )
    .lean();
  if (!Number.isSafeInteger(counter?.value) || counter!.value < 1)
    checkoutError(
      503,
      "ORDER_NUMBER_UNAVAILABLE",
      "Numerazione ordini non disponibile.",
    );
  return `EC-${year}-${String(counter!.value).padStart(8, "0")}`;
}
async function receipt(
  tx: Tx,
  input: {
    keyHash: string;
    requestHash: string;
    accountId: string;
    orderId: any;
  },
  id?: any,
) {
  return new tx.internal.orderRequests({
    ...(id ? { _id: id } : {}),
    shopId: tx.shopId,
    publicId: randomUUID(),
    ...input,
  }).save({ session: tx.session });
}
async function place(
  tx: Tx,
  principal: any,
  profile: any,
  input: ReturnType<typeof parsePlacement>,
) {
  const keyHash = commercePayloadHash([
      tx.shopId,
      principal.accountId,
      input.idempotencyKey,
    ]),
    requestHash = commercePayloadHash({ quotePublicId: input.quotePublicId }),
    scope = { shopId: tx.shopId, accountId: principal.accountId };
  const previous = await tx.internal.orderRequests
    .findOne({ ...scope, keyHash })
    .session(tx.session)
    .lean();
  if (previous) {
    if (previous.requestHash !== requestHash)
      checkoutError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "Chiave già usata per un ordine diverso.",
      );
    const order = await tx.internal.orders
      .findOne({ ...scope, _id: previous.orderId })
      .session(tx.session)
      .lean();
    if (!order)
      checkoutError(503, "ORDER_UNAVAILABLE", "Ordine non disponibile.");
    return { order: orderForCustomer(order), replayed: true };
  }
  const quote = await tx.internal.quotes
    .findOne({ ...scope, publicId: input.quotePublicId })
    .session(tx.session)
    .lean();
  if (!quote)
    checkoutError(404, "QUOTE_NOT_FOUND", "Riepilogo non disponibile.");
  const existing = await tx.internal.orders
    .findOne({ ...scope, quoteId: quote!._id })
    .session(tx.session)
    .lean();
  if (existing) {
    await receipt(tx, {
      keyHash,
      requestHash,
      accountId: principal.accountId,
      orderId: existing._id,
    });
    return { order: orderForCustomer(existing), replayed: true };
  }
  return withLinkedCommerceCustomer(tx, principal, async (customerId) => {
    const policy = await lockPolicy(tx, true),
      cart = await tx.storefront.carts
        .findOne({
          ...scope,
          _id: quote!.cartId,
          status: "active",
          expiresAt: { $gt: new Date() },
        })
        .session(tx.session)
        .lean(),
      link = await tx.internal.customerLinks
        .findOne(scope)
        .session(tx.session)
        .lean();
    const converted = await tx.internal.orders
      .exists({ ...scope, cartId: quote!.cartId })
      .session(tx.session);
    if (converted)
      checkoutError(
        409,
        "ORDER_ALREADY_CREATED",
        "Il carrello è già stato confermato. Consulta i tuoi ordini.",
      );
    await requireQuoteCurrent(
      tx,
      quote,
      principal,
      policy,
      cart,
      link,
      profile,
      customerId,
    );
    validateLineSnapshots(quote);
    if (!cart!.items.length || quote!.totals.grossMinor < 1)
      checkoutError(
        400,
        "ORDER_AMOUNT_INVALID",
        "L’ordine deve avere un importo positivo.",
      );
    const mapping = revenueMapping(quote, policy),
      now = new Date(),
      orderId = new mongoose.Types.ObjectId(),
      requestRecordId = new mongoose.Types.ObjectId();
    const order = await new tx.internal.orders({
      _id: orderId,
      shopId: tx.shopId,
      publicId: randomUUID(),
      number: await nextNumber(tx, now),
      accountId: principal.accountId,
      customerId,
      cartId: cart!._id,
      quoteId: quote!._id,
      sourceCommandId: requestRecordId,
      lines: quote!.lines,
      totals: quote!.totals,
      billing: quote!.billing,
      ...(quote!.shipping ? { shipping: quote!.shipping } : {}),
      termsVersion: quote!.termsVersion,
      pricingPolicyVersion: quote!.pricingPolicyVersion,
      fulfillmentSelections: quote!.fulfillmentSelections,
      accounting: quote!.accounting,
      revenueMapping: mapping,
      placedAt: now,
      operationalStatus: "open",
      paymentStatus: "awaiting",
      fulfillmentStatus: "unfulfilled",
      fulfillment: quote!.lines
        .filter((line: any) => line.kind !== "delivery")
        .map((line: any) => ({
          lineId: line.lineId,
          state: "unfulfilled",
          fulfilledQuantity: 0,
          shippedQuantity: 0,
        })),
      actor: tx.actor,
    }).save({ session: tx.session });
    await insertProgrammedCommerceRevenue(tx, {
      orderId: String(orderId),
      customerId: String(customerId),
      orderNumber: order.number,
      billingName: order.billing.name,
      totals: order.totals,
      category: mapping.category,
      variant: mapping.variant,
    });
    // Both fences are compare-and-set writes. A failed consumption rolls back the revenue too.
    const consumed = await tx.internal.quotes.updateOne(
      {
        ...scope,
        _id: quote!._id,
        revision: quote!.revision,
        expiresAt: { $gt: new Date() },
        consumedAt: { $exists: false },
      },
      { $set: { consumedAt: now, orderId }, $inc: { revision: 1 } },
      { session: tx.session },
    );
    if (consumed.matchedCount !== 1)
      checkoutError(
        409,
        "QUOTE_EXPIRED_OR_CHANGED",
        "Il riepilogo non è più valido.",
      );
    await replaceCommerceRecord(
      tx.storefront.carts,
      {
        shopId: tx.shopId,
        id: String(cart!._id),
        expectedRevision: cart!.revision,
      },
      { status: "converted", convertedOrderPublicId: order.publicId },
      tx.session,
    );
    await receipt(
      tx,
      { keyHash, requestHash, accountId: principal.accountId, orderId },
      requestRecordId,
    );
    const view = orderForCustomer(order.toObject());
    await new tx.storefront.orderViews({
      shopId: tx.shopId,
      publicId: order.publicId,
      accountId: principal.accountId,
      number: order.number,
      operationalStatus: order.operationalStatus,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      lines: view.lines,
      totals: view.totals,
      billing: view.billing,
      ...(view.shipping ? { shipping: view.shipping } : {}),
      placedAt: now,
    }).save({ session: tx.session });
    await new tx.internal.outbox({
      shopId: tx.shopId,
      kind: "order_created",
      deduplicationKey: commercePayloadHash([
        tx.shopId,
        "order_created",
        order.publicId,
      ]),
      aggregateId: orderId,
      aggregateRevision: order.revision,
      availableAt: now,
    }).save({ session: tx.session });
    await appendCommerceAudit(tx, {
      action: "order.created",
      objectType: "order",
      objectId: order.publicId,
      outcome: "succeeded",
    });
    return { order: view, replayed: false };
  });
}
export async function ordersForSite(
  proof: CheckoutProof,
  operation: "place" | "list" | "get",
  requestId: string,
  id?: string,
) {
  const p = parsePrincipal(proof.body.principal);
  // The first yearly counter insert can race across different accounts. Retry only that
  // aborted transaction; do not reuse an already committed nonce after an HTTP retry.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await withAtlasCommerceTransaction(
        { kind: "customer", id: p.accountId, requestId },
        async (tx) => {
          const { principal, profile } = await lockCheckoutPrincipal(tx, proof),
            scope = { shopId: tx.shopId, accountId: principal.accountId };
          if (operation === "place")
            return place(tx, principal, profile, parsePlacement(proof.body));
          if (operation === "get") {
            const order = await tx.internal.orders
              .findOne({ ...scope, publicId: publicId(id) })
              .session(tx.session)
              .lean();
            if (!order)
              checkoutError(404, "ORDER_NOT_FOUND", "Ordine non disponibile.");
            return orderForCustomer(order);
          }
          const input = objectWithKeys(proof.body, ["principal", "cursor"]),
            cursor =
              input.cursor === undefined ? undefined : publicId(input.cursor);
          const anchor = cursor
            ? await tx.internal.orders
                .findOne({ ...scope, publicId: cursor })
                .select({ _id: 1 })
                .session(tx.session)
                .lean()
            : null;
          if (cursor && !anchor)
            checkoutError(
              400,
              "INVALID_CURSOR",
              "Pagina ordini non disponibile.",
            );
          const rows = await tx.internal.orders
            .find({ ...scope, ...(anchor ? { _id: { $lt: anchor._id } } : {}) })
            .sort({ _id: -1 })
            .limit(31)
            .session(tx.session)
            .lean();
          const page = rows.slice(0, 30);
          // Cursor is a public order ID. Do not expose core/Mongo IDs to the browser.
          return {
            items: page.map(summary),
            nextCursor: rows.length > 30 ? page.at(-1)!.publicId : null,
          };
        },
      );
    } catch (error: any) {
      if (error?.code === 11000 && error?.keyPattern?.key) {
        if (attempt === 0) continue;
        checkoutError(
          503,
          "ORDER_NUMBER_UNAVAILABLE",
          "Numerazione ordini temporaneamente non disponibile.",
        );
      }
      throw error;
    }
  }
  return checkoutError(503, "ORDER_UNAVAILABLE", "Ordine non disponibile.");
}
export async function staffOrders(cursor?: string, status?: string) {
  const storage = await getAtlasCommerceStorage();
  const rows = await storage.internal.orders
    .find({
      shopId: process.env.ECOMMERCE_SHOP_ID,
      ...(cursor ? { _id: { $lt: cursor } } : {}),
      ...(status ? { operationalStatus: status } : {}),
    })
    .sort({ _id: -1 })
    .limit(31)
    .lean();
  const page = rows.slice(0, 30);
  return {
    items: page.map((order: any) => ({
      ...summary(order),
      name: order.billing.name,
      email: order.billing.email,
    })),
    nextCursor: rows.length > 30 ? String(page.at(-1)!._id) : null,
  };
}
export async function staffOrderDetails(
  actor: CommerceActor,
  id: string,
): Promise<StaffOrderDetails> {
  return withAtlasCommerceTransaction(actor, async (tx) => {
    const order = await tx.internal.orders
      .findOne({ shopId: tx.shopId, publicId: id })
      .session(tx.session)
      .lean();
    if (!order)
      checkoutError(404, "ORDER_NOT_FOUND", "Ordine non disponibile.");
    const linked = await tx.internal.revenueLinks
      .findOne({ shopId: tx.shopId, orderId: order!._id })
      .session(tx.session)
      .lean();
    const revenue = linked
      ? await tx.core.revenues
          .findById(linked.revenueId)
          .select({
            "data.statoFatturazione": 1,
            "data.totaleNetto": 1,
            "data.importoIva": 1,
            "data.totaleLordo": 1,
          })
          .session(tx.session)
          .lean()
      : null;
    const events = await tx.internal.auditEvents
      .find({
        shopId: tx.shopId,
        objectType: "order",
        objectId: order!.publicId,
      })
      .sort({ occurredAt: -1 })
      .limit(30)
      .session(tx.session)
      .lean();
    return {
      order: orderForCustomer(order),
      customerId: String(order!.customerId),
      revenue: linked
        ? {
            id: String(linked.revenueId),
            status: revenue?.data.statoFatturazione || "non_disponibile",
            category: linked.category,
            variant: linked.variant,
            expectedTotals: { ...linked.totals },
            requiresReview:
              !revenue ||
              [
                ["totaleNetto", "netMinor"],
                ["importoIva", "taxMinor"],
                ["totaleLordo", "grossMinor"],
              ].some(
                ([field, minor]) =>
                  typeof revenue.data[field] !== "number" ||
                  Math.round(revenue.data[field] * 100) !==
                    linked.totals[minor],
              ),
          }
        : null,
      accounting: (order!.accounting || []).map((entry: any) => ({
        lineId: entry.lineId,
        category: entry.category,
        variant: entry.variant,
      })),
      events: events.map((event: any) => ({
        action: event.action,
        occurredAt: event.occurredAt.toISOString(),
      })),
    };
  });
}
