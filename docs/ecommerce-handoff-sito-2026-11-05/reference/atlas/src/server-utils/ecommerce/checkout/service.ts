import "server-only";
import { randomUUID } from "node:crypto";
import { CommerceServiceError } from "@evolve/ecommerce-server/identity";
import { commercePayloadHash } from "@evolve/ecommerce-server/assertions";
import {
  calculateLineTotals,
  sumLineTotals,
  replaceCommerceRecord,
  type CommerceActor,
  type PriceSnapshot,
} from "@evolve/ecommerce-server/persistence";
import {
  getAtlasCommerceStorage,
  withAtlasCommerceTransaction,
  type AtlasCommerceTransaction,
} from "../persistence/atlas-storage";
import { appendCommerceAudit } from "../persistence/core-adapters";
import { lockPublishedCatalogItem } from "../catalog/checkout-guard";
import { withLinkedCommerceCustomer } from "../customers/service";
import {
  profileIdentityHash,
  customerIdentityHash,
  canonical,
} from "../customers/identity";
import { lockCheckoutPrincipal } from "./auth";
import { lockPolicy, publicPolicy } from "./policy";
import {
  checkoutError,
  parsePrincipal,
  parseCart,
  parseQuote,
} from "./validation";
type Tx = AtlasCommerceTransaction;
export interface CheckoutProof {
  token: string;
  body: Record<string, unknown>;
  path: string;
}
const CART_TTL = 30 * 86400000;
const priceOf = (product: any): PriceSnapshot => ({
  unitMinor: product.price.unitAmountCents,
  taxMode: product.price.taxMode,
  taxRateBps: product.price.taxRateBasisPoints,
  currency: "EUR",
});
function totals(price: PriceSnapshot, quantity: number) {
  try {
    return calculateLineTotals(price, quantity);
  } catch {
    return checkoutError(
      400,
      "AMOUNT_LIMIT",
      "Il totale supera i limiti del negozio.",
    );
  }
}
function sum(lines: any[]) {
  try {
    return sumLineTotals(lines);
  } catch {
    return checkoutError(
      400,
      "AMOUNT_LIMIT",
      "Il totale supera i limiti del negozio.",
    );
  }
}
async function activeCart(tx: Tx, accountId: string) {
  const now = new Date();
  await tx.storefront.carts.updateMany(
    {
      shopId: tx.shopId,
      accountId,
      status: "active",
      expiresAt: { $lte: now },
    },
    { $set: { status: "expired" }, $inc: { revision: 1 } },
    { session: tx.session },
  );
  return tx.storefront.carts
    .findOne({
      shopId: tx.shopId,
      accountId,
      status: "active",
      expiresAt: { $gt: now },
    })
    .session(tx.session)
    .lean();
}
async function preview(tx: Tx, cart: any, policy: any) {
  if (!cart)
    return {
      id: null,
      revision: 0,
      status: "empty",
      items: [],
      previewTotals: null,
      requiresReview: false,
      expiresAt: null,
    };
  const items: any[] = [];
  let requiresReview = false;
  for (const item of cart.items) {
    const listing = await tx.internal.listings
      .findOne({
        shopId: tx.shopId,
        publicId: item.productPublicId,
        enabled: true,
      })
      .session(tx.session)
      .lean();
    try {
      if (!listing)
        checkoutError(409, "CATALOG_CHANGED", "Prodotto non disponibile.");
      const { product } = await lockPublishedCatalogItem(
        tx,
        item.productPublicId,
        listing!.publishedRevision,
      );
      const changed = item.listingRevision !== product.revision,
        lineTotals = totals(priceOf(product), item.quantity);
      const limit =
        !!policy &&
        (cart.items.length > policy.maxLines ||
          item.quantity > policy.maxQuantity);
      requiresReview ||= changed || limit;
      items.push({
        productPublicId: item.productPublicId,
        listingRevision: item.listingRevision ?? null,
        currentListingRevision: product.revision,
        quantity: item.quantity,
        title: product.name,
        code: product.code,
        kind: product.kind,
        price: priceOf(product),
        totals: lineTotals,
        fulfillmentModes: product.fulfillmentModes,
        state: limit ? "limit_exceeded" : changed ? "changed" : "available",
      });
    } catch (error) {
      if (
        !(error instanceof CommerceServiceError) ||
        !["CATALOG_CHANGED", "AMOUNT_LIMIT"].includes(error.code)
      )
        throw error;
      requiresReview = true;
      items.push({
        productPublicId: item.productPublicId,
        listingRevision: item.listingRevision ?? null,
        quantity: item.quantity,
        state: "unavailable",
      });
    }
  }
  let previewTotals = null;
  if (items.every((item) => item.totals)) {
    try {
      previewTotals = sum(items);
    } catch {
      requiresReview = true;
    }
  }
  if (
    policy &&
    previewTotals &&
    previewTotals.grossMinor > policy.maxGrossMinor
  )
    requiresReview = true;
  return {
    id: cart.publicId,
    ...(cart.status === "converted" && cart.convertedOrderPublicId
      ? { convertedOrderPublicId: cart.convertedOrderPublicId }
      : {}),
    revision: cart.revision,
    status:
      cart.status === "active" && cart.expiresAt <= new Date()
        ? "expired"
        : cart.status,
    items,
    previewTotals,
    requiresReview,
    expiresAt: cart.expiresAt.toISOString(),
  };
}
async function replaceCart(
  tx: Tx,
  accountId: string,
  input: ReturnType<typeof parseCart>,
  policy: any,
) {
  const current = await activeCart(tx, accountId),
    limit = policy || {
      maxLines: 98,
      maxQuantity: 1000,
      maxGrossMinor: 1_000_000_000_000,
    };
  if (
    input.items.length > limit.maxLines ||
    input.items.some((item) => item.quantity > limit.maxQuantity)
  )
    checkoutError(
      400,
      "CART_LIMIT",
      "Il carrello supera i limiti configurati.",
    );
  if (
    current &&
    input.cartPublicId === null &&
    current.revision === 0 &&
    input.expectedRevision === 0 &&
    commercePayloadHash(current.items) === commercePayloadHash(input.items)
  )
    return preview(tx, current, policy);
  if (
    current
      ? current.publicId !== input.cartPublicId ||
        current.revision !== input.expectedRevision
      : input.cartPublicId !== null || input.expectedRevision !== 0
  )
    checkoutError(
      409,
      "CART_CHANGED",
      "Il carrello è cambiato. Ricaricalo prima di salvare.",
    );
  const rows = [];
  for (const item of input.items) {
    const { product } = await lockPublishedCatalogItem(
      tx,
      item.productPublicId,
      item.listingRevision,
    );
    rows.push({ totals: totals(priceOf(product), item.quantity) });
  }
  if (rows.length && sum(rows).grossMinor > limit.maxGrossMinor)
    checkoutError(
      400,
      "AMOUNT_LIMIT",
      "Il totale supera il limite configurato.",
    );
  if (
    current &&
    commercePayloadHash(current.items) === commercePayloadHash(input.items)
  )
    return preview(tx, current, policy);
  const saved = current
    ? await replaceCommerceRecord(
        tx.storefront.carts,
        {
          shopId: tx.shopId,
          id: String(current._id),
          expectedRevision: current.revision,
        },
        { items: input.items, expiresAt: new Date(Date.now() + CART_TTL) },
        tx.session,
      )
    : await new tx.storefront.carts({
        shopId: tx.shopId,
        accountId,
        publicId: randomUUID(),
        items: input.items,
        expiresAt: new Date(Date.now() + CART_TTL),
      }).save({ session: tx.session });
  await appendCommerceAudit(tx, {
    action: "cart.saved",
    objectType: "cart",
    objectId: saved.publicId,
    outcome: "succeeded",
  });
  return preview(tx, saved.toObject(), policy);
}
function quotePublic(quote: any) {
  return {
    id: quote.publicId,
    cartPublicId: quote.cartPublicId,
    cartRevision: quote.cartRevision,
    policyRevision: quote.policyRevision,
    lines: quote.lines.map((line: any) => ({
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
    totals: { ...quote.totals },
    billing: quote.billing,
    ...(quote.shipping ? { shipping: quote.shipping } : {}),
    fulfillmentSelections: quote.fulfillmentSelections.map((item: any) => ({
      optionPublicId: item.optionPublicId,
      mode: item.mode,
      label: item.label,
      details: item.details || "",
      price: { ...item.price },
    })),
    termsVersion: quote.termsVersion,
    expiresAt: quote.expiresAt.toISOString(),
    createdAt: quote.createdAt.toISOString(),
  };
}
export async function requireQuoteCurrent(
  tx: Tx,
  quote: any,
  principal: any,
  policy: any,
  cart: any,
  link: any,
  profile: any,
  customerId: any,
) {
  if (
    !quote ||
    !quote.fulfillmentSelections ||
    !quote.accounting ||
    quote.expiresAt <= new Date() ||
    quote.consumedAt ||
    !policy?.enabled ||
    quote.policyRevision !== policy.revision ||
    quote.credentialVersion !== principal.credentialVersion ||
    quote.accessVersion !== principal.accessVersion ||
    String(quote.customerId) !== String(customerId) ||
    quote.profileIdentityHash !== profileIdentityHash(tx.shopId, profile) ||
    quote.customerLinkRevision !== link.revision ||
    !cart ||
    String(quote.cartId) !== String(cart._id) ||
    quote.cartRevision !== cart.revision
  )
    checkoutError(
      409,
      "QUOTE_EXPIRED_OR_CHANGED",
      "Il riepilogo non è più valido. Richiedine uno nuovo.",
    );
  const customer = await tx.core.customers
    .findById(customerId)
    .select({ data: 1 })
    .session(tx.session)
    .lean();
  if (
    !customer ||
    customerIdentityHash(customer) !== quote.customerIdentityHash
  )
    checkoutError(
      409,
      "CUSTOMER_REVIEW_REQUIRED",
      "Il profilo commerciale richiede una verifica.",
    );
  for (const line of quote.lines)
    if (line.kind !== "delivery")
      await lockPublishedCatalogItem(
        tx,
        line.productPublicId,
        line.listingRevision,
      );
}
async function quoteOperation(
  tx: Tx,
  principal: any,
  profile: any,
  input: ReturnType<typeof parseQuote> | null,
  quoteId?: string,
) {
  return withLinkedCommerceCustomer(tx, principal, async (customerId) => {
    const cart = await activeCart(tx, principal.accountId),
      policy = await lockPolicy(tx, true);
    const link = await tx.internal.customerLinks
      .findOne({ shopId: tx.shopId, accountId: principal.accountId })
      .session(tx.session)
      .lean();
    if (!input) {
      const quote = await tx.internal.quotes
        .findOne({
          shopId: tx.shopId,
          accountId: principal.accountId,
          publicId: quoteId,
        })
        .session(tx.session)
        .lean();
      if (!quote)
        checkoutError(404, "QUOTE_NOT_FOUND", "Riepilogo non disponibile.");
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
      return quotePublic({ ...quote, cartPublicId: cart!.publicId });
    }
    const { idempotencyKey, ...normalized } = input,
      keyHash = commercePayloadHash([
        tx.shopId,
        principal.accountId,
        idempotencyKey,
      ]),
      requestHash = commercePayloadHash([principal.accountId, normalized]);
    const receipt = await tx.internal.quoteRequests
      .findOne({ shopId: tx.shopId, accountId: principal.accountId, keyHash })
      .session(tx.session)
      .lean();
    if (receipt) {
      if (receipt.requestHash !== requestHash)
        checkoutError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "Chiave già usata per un riepilogo diverso.",
        );
      const quote = await tx.internal.quotes
        .findOne({
          shopId: tx.shopId,
          accountId: principal.accountId,
          sourceCommandId: receipt._id,
        })
        .session(tx.session)
        .lean();
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
      return quotePublic({ ...quote, cartPublicId: cart!.publicId });
    }
    if (
      !cart ||
      cart.publicId !== input.cartPublicId ||
      cart.revision !== input.cartRevision ||
      !cart.items.length
    )
      checkoutError(
        409,
        "CART_CHANGED",
        "Il carrello è vuoto, scaduto o modificato.",
      );
    if (
      policy!.revision !== input.policyRevision ||
      policy!.termsVersion !== input.termsVersion
    )
      checkoutError(
        409,
        "POLICY_CHANGED",
        "Condizioni o modalità cambiate. Aggiorna il riepilogo.",
      );
    if (
      cart!.items.length > policy!.maxLines ||
      cart!.items.some((item: any) => item.quantity > policy!.maxQuantity)
    )
      checkoutError(
        400,
        "CART_LIMIT",
        "Il carrello supera i limiti configurati.",
      );
    if (
      input.billing.kind !== profile.kind ||
      input.billing.email !== profile.verifiedEmail ||
      !policy!.countries.includes(input.billing.address.country) ||
      (policy!.requireIndividualTaxCode &&
        input.billing.kind === "individual" &&
        !input.billing.taxCode) ||
      (policy!.requireCompanyVat &&
        input.billing.kind === "company" &&
        !input.billing.vatNumber)
    )
      checkoutError(
        400,
        "BILLING_INVALID",
        "Completa i dati di fatturazione e verifica il Paese ammesso.",
      );
    const customer = await tx.core.customers
      .findById(customerId)
      .select({ data: 1 })
      .session(tx.session)
      .lean();
    if (
      !customer ||
      canonical(customer.data.ragioneSociale) !==
        canonical(input.billing.name) ||
      ["piva", "codicefiscale"].some((key) => {
        const expected = customer.data[key],
          supplied =
            key === "piva" ? input.billing.vatNumber : input.billing.taxCode;
        return (
          expected &&
          (typeof expected !== "string" ||
            canonical(expected) !== canonical(supplied))
        );
      })
    )
      checkoutError(
        409,
        "BILLING_REVIEW_REQUIRED",
        "Verifica i dati di fatturazione con l’assistenza prima di procedere.",
      );
    const lines: any[] = [],
      accounting: any[] = [],
      products: any[] = [];
    for (const item of cart!.items) {
      if (!Number.isSafeInteger(item.listingRevision))
        checkoutError(
          409,
          "CART_CHANGED",
          "Conferma le versioni correnti dei prodotti nel carrello.",
        );
      const { product, revenue } = await lockPublishedCatalogItem(
        tx,
        item.productPublicId,
        item.listingRevision,
      );
      const line = {
        lineId: randomUUID(),
        productPublicId: product.id,
        listingRevision: product.revision,
        title: product.name,
        code: product.code,
        kind: product.kind,
        quantity: item.quantity,
        price: priceOf(product),
        totals: totals(priceOf(product), item.quantity),
      };
      lines.push(line);
      products.push(product);
      accounting.push({
        lineId: line.lineId,
        category: revenue.category,
        variant: revenue.variant,
      });
    }
    const physical = products.filter((item) => item.kind === "physical"),
      services = products.filter((item) => item.kind === "service");
    const physicalSelection = input.fulfillmentSelections.filter(
        (item) => item.mode !== "service",
      ),
      serviceSelection = input.fulfillmentSelections.filter(
        (item) => item.mode === "service",
      );
    if (
      physicalSelection.length !== (physical.length ? 1 : 0) ||
      serviceSelection.length !== (services.length ? 1 : 0) ||
      physical.some(
        (item) => !item.fulfillmentModes.includes(physicalSelection[0]?.mode),
      ) ||
      services.some((item) => !item.fulfillmentModes.includes("service"))
    )
      checkoutError(
        400,
        "DELIVERY_INCOMPATIBLE",
        "Scegli modalità compatibili con tutti i prodotti e servizi.",
      );
    const shipping = physicalSelection[0]?.mode === "shipping";
    if (
      shipping
        ? !input.shipping || !policy!.countries.includes(input.shipping.country)
        : !!input.shipping
    )
      checkoutError(
        400,
        "SHIPPING_INVALID",
        "Verifica l’indirizzo e la modalità di consegna.",
      );
    const selections = input.fulfillmentSelections.map((selection) => {
      const option = policy!.options.find(
        (item: any) =>
          item.publicId === selection.optionPublicId &&
          item.enabled &&
          item.mode === selection.mode,
      );
      const destination =
        selection.mode === "shipping"
          ? input.shipping!.country
          : input.billing.address.country;
      if (!option || !option.countries.includes(destination))
        checkoutError(
          409,
          "DELIVERY_CHANGED",
          "Modalità non disponibile per il Paese scelto.",
        );
      if (option.price.unitMinor > 0) {
        const line = {
          lineId: randomUUID(),
          productPublicId: option.publicId,
          listingRevision: policy!.revision,
          title: option.label,
          code: option.mode.toUpperCase(),
          kind: "delivery",
          quantity: 1,
          price: option.price,
          totals: totals(option.price, 1),
        };
        lines.push(line);
        accounting.push({
          lineId: line.lineId,
          category: option.revenueCategory,
          variant: option.revenueVariant,
        });
      }
      return {
        optionPublicId: option.publicId,
        mode: option.mode,
        label: option.label,
        ...(option.details ? { details: option.details } : {}),
        price: option.price,
      };
    });
    const total = sum(lines);
    if (total.grossMinor > policy!.maxGrossMinor)
      checkoutError(
        400,
        "AMOUNT_LIMIT",
        "Il totale, comprese le modalità scelte, supera il limite del negozio.",
      );
    const receiptRecord = await new tx.internal.quoteRequests({
      shopId: tx.shopId,
      publicId: randomUUID(),
      accountId: principal.accountId,
      keyHash,
      requestHash,
    }).save({ session: tx.session });
    const quote = await new tx.internal.quotes({
      shopId: tx.shopId,
      publicId: randomUUID(),
      accountId: principal.accountId,
      cartId: cart!._id,
      cartRevision: cart!.revision,
      sourceCommandId: receiptRecord._id,
      customerLinkRevision: link!.revision,
      accessVersion: principal.accessVersion,
      credentialVersion: principal.credentialVersion,
      sessionId: principal.sessionId,
      customerId,
      profileIdentityHash: profileIdentityHash(tx.shopId, profile),
      customerIdentityHash: customerIdentityHash(customer),
      requestHash,
      policyRevision: policy!.revision,
      fulfillmentSelections: selections,
      accounting,
      lines,
      totals: total,
      billing: input.billing,
      ...(input.shipping ? { shipping: input.shipping } : {}),
      pricingPolicyVersion: `${policy!.publicId}:${policy!.revision}`,
      termsVersion: policy!.termsVersion,
      expiresAt: new Date(Date.now() + policy!.quoteTtlSeconds * 1000),
    }).save({ session: tx.session });
    await appendCommerceAudit(tx, {
      action: "checkout.quote_created",
      objectType: "quote",
      objectId: quote.publicId,
      outcome: "succeeded",
    });
    return quotePublic({ ...quote.toObject(), cartPublicId: cart!.publicId });
  });
}
export async function checkoutForSite(
  proof: CheckoutProof,
  operation: "cart" | "save" | "options" | "quote" | "read-quote",
  requestId: string,
  quoteId?: string,
) {
  const p = parsePrincipal(proof.body.principal);
  return withAtlasCommerceTransaction(
    { kind: "customer", id: p.accountId, requestId },
    async (tx) => {
      const { principal, profile } = await lockCheckoutPrincipal(tx, proof);
      if (operation === "options")
        return publicPolicy(await lockPolicy(tx, true));
      if (operation === "quote" || operation === "read-quote")
        return quoteOperation(
          tx,
          principal,
          profile,
          operation === "quote" ? parseQuote(proof.body) : null,
          quoteId,
        );
      const policy = await lockPolicy(tx, false);
      return operation === "cart"
        ? preview(tx, await activeCart(tx, principal.accountId), policy)
        : replaceCart(tx, principal.accountId, parseCart(proof.body), policy);
    },
  );
}
export async function staffCarts(
  actor: CommerceActor,
  cursor?: string,
  state?: string,
) {
  const storage = await getAtlasCommerceStorage(),
    shopId = process.env.ECOMMERCE_SHOP_ID!;
  const now = new Date(),
    stateFilter =
      state === "active"
        ? { status: "active", expiresAt: { $gt: now } }
        : state === "expired"
          ? {
              $or: [
                { status: "expired" },
                { status: "active", expiresAt: { $lte: now } },
              ],
            }
          : state
            ? { status: state }
            : {};
  const carts = await storage.storefront.carts
    .find({
      shopId,
      ...(cursor ? { _id: { $lt: cursor } } : {}),
      ...stateFilter,
    })
    .sort({ _id: -1 })
    .limit(31)
    .lean();
  const page = carts.slice(0, 30),
    profiles = await storage.storefront.accountProfiles
      .find({
        shopId,
        accountId: { $in: page.map((item: any) => item.accountId) },
      })
      .lean();
  const byAccount = new Map<string, any>(
    profiles.map((item: any): [string, any] => [String(item.accountId), item]),
  );
  return {
    items: page.map((item: any) => ({
      id: item.publicId,
      name:
        byAccount.get(String(item.accountId))?.displayName ||
        "Account del sito",
      email: byAccount.get(String(item.accountId))?.verifiedEmail || "",
      status:
        item.status === "active" && item.expiresAt <= new Date()
          ? "expired"
          : item.status,
      revision: item.revision,
      lines: item.items.length,
      units: item.items.reduce(
        (count: number, row: any) => count + row.quantity,
        0,
      ),
      expiresAt: item.expiresAt.toISOString(),
    })),
    nextCursor: carts.length > 30 ? String(page.at(-1)!._id) : null,
  };
}
export async function staffCartDetails(actor: CommerceActor, id: string) {
  return withAtlasCommerceTransaction(actor, async (tx) => {
    const cart = await tx.storefront.carts
      .findOne({ shopId: tx.shopId, publicId: id })
      .session(tx.session)
      .lean();
    if (!cart)
      checkoutError(404, "CART_NOT_FOUND", "Carrello non disponibile.");
    const profile = await tx.storefront.accountProfiles
      .findOne({ shopId: tx.shopId, accountId: cart!.accountId })
      .session(tx.session)
      .lean();
    const quotes = await tx.internal.quotes
      .find({
        shopId: tx.shopId,
        accountId: cart!.accountId,
        cartId: cart!._id,
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .session(tx.session)
      .lean();
    return {
      cart: await preview(tx, cart, await lockPolicy(tx, false)),
      owner: {
        name: profile?.displayName || "Account del sito",
        email: profile?.verifiedEmail || "",
      },
      quotes: quotes
        .filter((quote: any) => quote.fulfillmentSelections && quote.accounting)
        .map((quote: any) => ({
          ...quotePublic({ ...quote, cartPublicId: cart!.publicId }),
          status: quote.consumedAt
            ? "consumed"
            : quote.expiresAt <= new Date()
              ? "expired"
              : "requires_validation",
        })),
    };
  });
}
