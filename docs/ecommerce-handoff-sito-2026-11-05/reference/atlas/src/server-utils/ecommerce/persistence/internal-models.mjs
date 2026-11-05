// Private Atlas models. This file is deliberately absent from the storefront package.
import {
  field as f,
  defineCommerceModel,
  unique,
  index,
  publicId,
  digest,
  optional as opt,
  assertInvariant,
  address,
  billing,
  lines,
  totals,
  taxPrice,
  content,
  actor,
  jobFields,
  operationalStatus,
  paymentStatus,
  fulfillmentStatus,
  validateLineSnapshots,
  validateTotals,
} from "@evolve/ecommerce-server/persistence";

const cache = new WeakMap();
const optionalPublicId = () => ({ ...publicId(), ...opt });
const immutableId = () => f.id({ immutable: true });
const publicKey = (name) => unique(name, { shopId: 1, publicId: 1 });
const jobIndexes = () => [
  index("jobs_ready", { shopId: 1, state: 1, availableAt: 1 }),
  index("jobs_lease", { "lease.expiresAt": 1 }),
];
export const INTERNAL_COLLECTIONS = Object.freeze({
  customerLinks: "commerce_customer_links",
  customerClaims: "commerce_customer_claims",
  identityReceipts: "commerce_identity_receipts",
  identityJobs: "commerce_identity_jobs",
  listings: "commerce_listings",
  quotes: "commerce_quotes",
  quoteRequests: "commerce_quote_requests",
  orderRequests: "commerce_order_requests",
  requestClaims: "commerce_personal_request_claims",
  checkoutPolicies: "commerce_checkout_policies",
  orders: "commerce_orders",
  fulfillmentLinks: "commerce_fulfillment_links",
  fulfillmentRequests: "commerce_fulfillment_requests",
  workflowTransitions: "commerce_workflow_transitions",
  trackingRateLimits: "commerce_tracking_rate_limits",
  revenueLinks: "commerce_revenue_links",
  paymentAttempts: "commerce_payment_attempts",
  paymentRequests: "commerce_payment_requests",
  paymentReceipts: "commerce_payment_receipts",
  refundReceipts: "commerce_refund_receipts",
  paymentEvents: "commerce_payment_events",
  refunds: "commerce_refunds",
  staffCommandInbox: "commerce_staff_command_inbox",
  operations: "commerce_operations",
  outbox: "commerce_outbox",
  auditEvents: "commerce_audit_events",
  counters: "commerce_counters",
});
const STAFF_COMMANDS = Object.freeze({
  resolve_customer: {
    accountId: f.id(),
    customerId: f.id(),
    expectedRevision: f.integer(),
    evidenceCode: f.text(80),
  },
  hold_order: {
    orderPublicId: publicId(),
    expectedRevision: f.integer(),
    reasonCode: f.text(80),
  },
  cancel_order: {
    orderPublicId: publicId(),
    expectedRevision: f.integer(),
    reasonCode: f.text(80),
  },
  request_refund: {
    orderPublicId: publicId(),
    paymentAttemptId: f.id(),
    amountMinor: f.integer(1_000_000_000_000, { min: 1 }),
    expectedRevision: f.integer(),
    reasonCode: f.text(80),
  },
});
export const STAFF_COMMAND_CAPABILITIES = Object.freeze({
  resolve_customer: "ecommerce.customers.resolve",
  hold_order: "ecommerce.orders.manage",
  cancel_order: "ecommerce.orders.cancel",
  request_refund: "ecommerce.payments.refund",
});

export function buildInternalCommerceModels(connection) {
  if (cache.has(connection)) return cache.get(connection);
  const definitions = {};
  const add = (key, fields, indexes, options) => {
    if (fields.attempts && fields.lease)
      options = {
        ...options,
        validate: (doc) => {
          assertInvariant(
            (doc.state === "running") === !!doc.lease,
            "JOB_LEASE_STATE",
          );
          assertInvariant(
            !["succeeded", "dead"].includes(doc.state) || !!doc.finishedAt,
            "JOB_FINISHED_AT",
          );
        },
      };
    definitions[key] = defineCommerceModel(
      connection,
      INTERNAL_COLLECTIONS[key],
      fields,
      indexes,
      options,
    );
  };
  add(
    "customerLinks",
    {
      accountId: immutableId(),
      customerId: f.id(opt),
      status: f.choice(["pending", "linked", "review_required", "blocked"], {
        default: "pending",
      }),
      verifiedEmailHash: digest(),
      profileIdentityHash: digest(opt),
      customerIdentityHash: digest(opt),
      reviewCandidateId: f.id(opt),
      source: f.choice(
        [
          "automatic_existing",
          "automatic_created",
          "staff_existing",
          "staff_created",
        ],
        opt,
      ),
      guard: f.integer(Number.MAX_SAFE_INTEGER, { default: 0 }),
      evidenceCode: f.text(80, opt),
      linkedAt: f.date(opt),
      actor: actor(),
    },
    [
      unique("shop_account", { shopId: 1, accountId: 1 }),
      index("customer_accounts", { shopId: 1, customerId: 1 }),
      index("customer_link_review", { shopId: 1, status: 1, updatedAt: 1 }),
    ],
    {
      validate: (doc) =>
        assertInvariant(
          doc.status === "linked"
            ? !!doc.customerId && !!doc.linkedAt
            : !doc.customerId,
          "CUSTOMER_LINK",
        ),
    },
  );
  // Serialization guard for concurrent resolution/creation. This is not a global unique-email constraint on existing clients.
  add(
    "identityReceipts",
    {
      eventId: immutableId(),
      accountId: immutableId(),
      profileIdentityHash: digest(),
    },
    [unique("identity_event_receipt", { shopId: 1, eventId: 1 })],
    { appendOnly: true },
  );
  add(
    "identityJobs",
    { eventId: immutableId(), accountId: immutableId(), ...jobFields() },
    [unique("identity_event_job", { shopId: 1, eventId: 1 }), ...jobIndexes()],
  );
  add(
    "customerClaims",
    {
      identityHash: digest({ immutable: true }),
      guard: f.integer(Number.MAX_SAFE_INTEGER, { default: 0 }),
    },
    [unique("customer_identity_guard", { shopId: 1, identityHash: 1 })],
  );
  add(
    "listings",
    {
      publicId: publicId(),
      productId: immutableId(),
      enabled: f.boolean({ default: false }),
      guard: f.integer(Number.MAX_SAFE_INTEGER, { default: 0 }),
      draftRevision: f.integer(),
      publishedRevision: f.integer(Number.MAX_SAFE_INTEGER, opt),
      publishedSourceHash: digest(opt),
      publishedAccounting: f.object(
        {
          category: f.choice([
            "stampa3d",
            "consulenza",
            "sviluppoSoftware",
            "atlas",
            "altro",
          ]),
          variant: f.text(100),
        },
        opt,
      ),
      draft: f.object(
        {
          slug: f.text(160, { pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
          content: content(),
          kind: f.choice(["physical", "service"]),
          priceSource: f.choice(["source", "online_override"]),
          price: taxPrice(),
          sourceRevisionHash: digest(),
          fulfillmentModes: f.array(
            f.choice(["shipping", "pickup", "service"]),
            3,
            { min: 1 },
          ),
          revenueCategory: f.choice([
            "stampa3d",
            "consulenza",
            "sviluppoSoftware",
            "atlas",
            "altro",
          ]),
          revenueVariant: f.text(100),
        },
        opt,
      ),
      publishedAt: f.date(opt),
      actor: actor(),
    },
    [
      publicKey("listing_public_id"),
      unique("shop_source_product", { shopId: 1, productId: 1 }),
      index("public_catalog_enabled", { shopId: 1, enabled: 1, publicId: 1 }),
    ],
    {
      validate: (doc) =>
        assertInvariant(
          !doc.enabled ||
            (Number.isSafeInteger(doc.publishedRevision) &&
              !!doc.publishedAt &&
              !!doc.publishedSourceHash &&
              !!doc.publishedAccounting),
          "PUBLISHED_LISTING",
        ),
    },
  );
  add(
    "checkoutPolicies",
    {
      publicId: publicId(),
      enabled: f.boolean({ default: false }),
      termsVersion: f.text(80, opt),
      countries: f.array(f.text(2, { pattern: "^[A-Z]{2}$" }), 30),
      maxLines: f.integer(98, { min: 1 }),
      maxQuantity: f.integer(1000, { min: 1 }),
      maxGrossMinor: f.integer(1_000_000_000_000, { min: 1 }),
      quoteTtlSeconds: f.integer(1800, { min: 300 }),
      requireIndividualTaxCode: f.boolean(),
      requireCompanyVat: f.boolean(),
      mixedRevenue: f.object(
        {
          category: f.choice([
            "stampa3d",
            "consulenza",
            "sviluppoSoftware",
            "atlas",
            "altro",
          ]),
          variant: f.text(100),
        },
        opt,
      ),
      options: f.array(
        f.object({
          publicId: publicId(),
          enabled: f.boolean(),
          mode: f.choice(["shipping", "pickup", "service"]),
          label: f.text(200),
          details: f.text(500, opt),
          countries: f.array(f.text(2, { pattern: "^[A-Z]{2}$" }), 30, {
            min: 1,
          }),
          price: taxPrice(),
          revenueCategory: f.choice(
            ["stampa3d", "consulenza", "sviluppoSoftware", "atlas", "altro"],
            opt,
          ),
          revenueVariant: f.text(100, opt),
        }),
        20,
      ),
      guard: f.integer(Number.MAX_SAFE_INTEGER, { default: 0 }),
      actor: actor(),
    },
    [
      publicKey("checkout_policy_id"),
      unique("one_checkout_policy", { shopId: 1 }),
    ],
    {
      validate: (doc) => {
        assertInvariant(
          new Set(doc.countries).size === doc.countries.length &&
            new Set(doc.options.map((item) => item.publicId)).size ===
              doc.options.length,
          "POLICY_DUPLICATE",
        );
        assertInvariant(
          !doc.enabled ||
            (!!doc.termsVersion &&
              doc.countries.length > 0 &&
              doc.options.some((item) => item.enabled)),
          "CHECKOUT_CONFIGURATION",
        );
        for (const item of doc.options) {
          assertInvariant(
            item.countries.every((country) => doc.countries.includes(country)),
            "DELIVERY_COUNTRY",
          );
          assertInvariant(
            item.price.unitMinor === 0 ||
              (!!item.revenueCategory && !!item.revenueVariant),
            "DELIVERY_REVENUE",
          );
          assertInvariant(
            !item.enabled || item.mode !== "pickup" || !!item.details,
            "PICKUP_INSTRUCTIONS",
          );
        }
      },
    },
  );
  add(
    "quoteRequests",
    {
      publicId: publicId(),
      accountId: immutableId(),
      keyHash: digest({ immutable: true }),
      requestHash: digest({ immutable: true }),
    },
    [
      publicKey("quote_request_id"),
      unique("quote_request_once", { shopId: 1, accountId: 1, keyHash: 1 }),
    ],
    { appendOnly: true },
  );
  add(
    "requestClaims",
    {
      nonceHash: digest({ immutable: true }),
      accountId: immutableId(),
      sessionId: immutableId(),
      expiresAt: f.date(),
    },
    [
      unique("personal_request_once", { shopId: 1, nonceHash: 1 }),
      index(
        "cleanup_request_claims",
        { expiresAt: 1 },
        { expireAfterSeconds: 0 },
      ),
    ],
    { appendOnly: true },
  );
  add(
    "quotes",
    {
      publicId: publicId(),
      accountId: immutableId(),
      cartId: immutableId(),
      cartRevision: f.integer(Number.MAX_SAFE_INTEGER, { immutable: true }),
      sourceCommandId: immutableId(),
      customerLinkRevision: f.integer(Number.MAX_SAFE_INTEGER, {
        immutable: true,
      }),
      accessVersion: f.integer(Number.MAX_SAFE_INTEGER, { immutable: true }),
      sessionId: f.id({ ...opt, immutable: true }),
      credentialVersion: f.integer(Number.MAX_SAFE_INTEGER, {
        ...opt,
        immutable: true,
      }),
      customerId: f.id({ ...opt, immutable: true }),
      profileIdentityHash: digest({ ...opt, immutable: true }),
      customerIdentityHash: digest({ ...opt, immutable: true }),
      requestHash: digest({ ...opt, immutable: true }),
      policyRevision: f.integer(Number.MAX_SAFE_INTEGER, {
        ...opt,
        immutable: true,
      }),
      fulfillmentSelections: f.array(
        f.object({
          optionPublicId: publicId(),
          mode: f.choice(["shipping", "pickup", "service"]),
          label: f.text(200),
          details: f.text(500, opt),
          price: taxPrice(),
        }),
        2,
        { ...opt, immutable: true },
      ),
      accounting: f.array(
        f.object({
          lineId: publicId(),
          category: f.choice([
            "stampa3d",
            "consulenza",
            "sviluppoSoftware",
            "atlas",
            "altro",
          ]),
          variant: f.text(100),
        }),
        100,
        { ...opt, immutable: true },
      ),
      lines: lines(),
      totals: { ...totals(), immutable: true },
      billing: { ...billing(), immutable: true },
      shipping: { ...address(), ...opt, immutable: true },
      deliveryOptionPublicId: optionalPublicId(),
      pricingPolicyVersion: f.text(80, { immutable: true }),
      termsVersion: f.text(80, { immutable: true }),
      expiresAt: f.date({ immutable: true }),
      consumedAt: f.date(opt),
      orderId: f.id(opt),
    },
    [
      publicKey("quote_public_id"),
      unique("quote_command", { shopId: 1, sourceCommandId: 1 }),
      index("account_quotes", { shopId: 1, accountId: 1, createdAt: -1 }),
    ],
    {
      validate: (doc) => {
        validateLineSnapshots(doc);
        assertInvariant(
          !!doc.consumedAt === !!doc.orderId,
          "QUOTE_CONSUMPTION",
        );
      },
    },
  );
  add(
    "orderRequests",
    {
      publicId: publicId(),
      accountId: immutableId(),
      orderId: immutableId(),
      keyHash: digest({ immutable: true }),
      requestHash: digest({ immutable: true }),
    },
    [
      publicKey("order_request_id"),
      unique("order_request_once", { shopId: 1, accountId: 1, keyHash: 1 }),
    ],
    { appendOnly: true },
  );
  add(
    "orders",
    {
      publicId: publicId(),
      number: f.text(80, { immutable: true }),
      accountId: immutableId(),
      customerId: immutableId(),
      cartId: immutableId(),
      quoteId: immutableId(),
      sourceCommandId: immutableId(),
      revenueMapping: f.object(
        {
          category: f.choice([
            "stampa3d",
            "consulenza",
            "sviluppoSoftware",
            "atlas",
            "altro",
          ]),
          variant: f.text(100),
        },
        { ...opt, immutable: true },
      ),
      fulfillmentSelections: f.array(
        f.object({
          optionPublicId: publicId(),
          mode: f.choice(["shipping", "pickup", "service"]),
          label: f.text(200),
          details: f.text(500, opt),
          price: taxPrice(),
        }),
        2,
        { ...opt, immutable: true },
      ),
      accounting: f.array(
        f.object({
          lineId: publicId(),
          category: f.choice([
            "stampa3d",
            "consulenza",
            "sviluppoSoftware",
            "atlas",
            "altro",
          ]),
          variant: f.text(100),
        }),
        100,
        { ...opt, immutable: true },
      ),
      lines: lines(),
      totals: { ...totals(), immutable: true },
      billing: { ...billing(), immutable: true },
      shipping: { ...address(), ...opt, immutable: true },
      termsVersion: f.text(80, { immutable: true }),
      pricingPolicyVersion: f.text(80, { immutable: true }),
      placedAt: f.date({ immutable: true }),
      guard: f.integer(Number.MAX_SAFE_INTEGER, { ...opt, default: 0 }),
      fulfillmentRevision: f.integer(Number.MAX_SAFE_INTEGER, {
        ...opt,
        default: 0,
      }),
      trackingPublication: f.object(
        {
          version: f.integer(),
          state: f.choice(["published", "stale", "withdrawn"]),
          sourceRevision: f.integer(Number.MAX_SAFE_INTEGER, opt),
          contentHash: digest(opt),
          publishedAt: f.date(opt),
          publishedBy: f.id(opt),
          selection: f.array(
            f.object({
              cardId: publicId(),
              eventIds: f.array(publicId(), 500),
            }),
            100,
          ),
        },
        opt,
      ),
      paymentSummary: f.object(
        {
          paidMinor: f.integer(1_000_000_000_000),
          refundedMinor: f.integer(1_000_000_000_000),
          paidAt: f.date(opt),
          method: f.text(80, opt),
          requiresReview: f.boolean(),
        },
        opt,
      ),
      operationalStatus: operationalStatus(),
      paymentStatus: paymentStatus(),
      fulfillmentStatus: fulfillmentStatus(),
      fulfillment: f.array(
        f.object({
          lineId: publicId(),
          state: f.choice(
            [
              "unfulfilled",
              "preparing",
              "shipped",
              "delivered",
              "service_completed",
              "cancelled",
            ],
            { default: "unfulfilled" },
          ),
          fulfilledQuantity: f.integer(1000),
          shippedQuantity: f.integer(1000, { default: 0 }),
        }),
        100,
        { default: [] },
      ),
      staffNotes: f.text(10000, opt),
      actor: actor(),
    },
    [
      publicKey("order_public_id"),
      unique("order_number", { shopId: 1, number: 1 }),
      unique("one_order_per_cart", { shopId: 1, cartId: 1 }),
      unique("one_order_per_quote", { shopId: 1, quoteId: 1 }),
      unique("one_order_per_command", { shopId: 1, sourceCommandId: 1 }),
      index("account_orders", { shopId: 1, accountId: 1, placedAt: -1 }),
      index("open_orders", { shopId: 1, operationalStatus: 1, placedAt: -1 }),
    ],
    {
      validate: (doc) => {
        validateLineSnapshots(doc);
        const quantities = new Map(
          doc.lines.map((line) => [line.lineId, line.quantity]),
        );
        const seen = new Set();
        for (const line of doc.fulfillment) {
          assertInvariant(
            !seen.has(line.lineId) &&
              quantities.has(line.lineId) &&
              line.fulfilledQuantity <= quantities.get(line.lineId) &&
              line.shippedQuantity <= quantities.get(line.lineId),
            "FULFILLED_QUANTITY",
          );
          seen.add(line.lineId);
        }
      },
    },
  );
  add(
    "fulfillmentLinks",
    {
      publicId: publicId(),
      orderId: immutableId(),
      deliveryAnagraficaId: immutableId(),
      allocations: f.array(
        f.object({ lineId: publicId(), quantity: f.integer(1000, { min: 1 }) }),
        100,
        { min: 1 },
      ),
      primaryPlannedEventId: f.id(opt),
      title: f.text(200, opt),
      mode: f.choice(["shipping", "pickup", "service"], opt),
      status: f.choice(["active", "cancelled"], { default: "active" }),
      internalNotes: f.text(5000, opt),
      customerMessage: f.text(3000, opt),
      customerTitle: f.text(200, opt),
      phase: f.choice(
        ["planned", "preparing", "shipped", "delivered", "service_completed"],
        { ...opt, default: "planned" },
      ),
      shippedAt: f.date(opt),
      completedAt: f.date(opt),
      actor: actor(),
    },
    [
      publicKey("fulfillment_public_id"),
      unique("one_order_per_delivery", { shopId: 1, deliveryAnagraficaId: 1 }),
      index("order_deliveries", { shopId: 1, orderId: 1 }),
    ],
    {
      validate: (doc) =>
        assertInvariant(
          new Set(doc.allocations.map((line) => line.lineId)).size ===
            doc.allocations.length,
          "DUPLICATE_ALLOCATION",
        ),
    },
  );
  add(
    "fulfillmentRequests",
    {
      staffId: immutableId(),
      orderId: immutableId(),
      kind: f.choice(
        ["card", "event", "phase", "order", "publish", "withdraw"],
        { immutable: true },
      ),
      keyHash: digest({ immutable: true }),
      requestHash: digest({ immutable: true }),
      resultPublicId: publicId(),
    },
    [
      unique("fulfillment_request_once", {
        shopId: 1,
        staffId: 1,
        kind: 1,
        keyHash: 1,
      }),
    ],
    { appendOnly: true },
  );
  add(
    "workflowTransitions",
    {
      orderId: immutableId(),
      orderPublicId: publicId(),
      cardPublicId: optionalPublicId(),
      kind: f.choice(["card_phase", "order_phase", "publication"], {
        immutable: true,
      }),
      from: f.text(100),
      to: f.text(100),
      reason: f.text(500),
      workspaceRevision: f.integer(),
      contentHash: digest(opt),
      actor: actor(),
      occurredAt: f.date(),
    },
    [
      index("workflow_order_history", {
        shopId: 1,
        orderId: 1,
        occurredAt: -1,
      }),
    ],
    { appendOnly: true },
  );
  add(
    "trackingRateLimits",
    {
      accountId: immutableId(),
      bucketAt: f.date({ immutable: true }),
      count: f.integer(60, { min: 1 }),
      expiresAt: f.date(),
    },
    [
      unique("tracking_account_bucket", {
        shopId: 1,
        accountId: 1,
        bucketAt: 1,
      }),
      index(
        "tracking_bucket_expiry",
        { expiresAt: 1 },
        { expireAfterSeconds: 0 },
      ),
    ],
  );
  add(
    "revenueLinks",
    {
      orderId: immutableId(),
      revenueId: immutableId(),
      totals: { ...totals(), immutable: true },
      category: f.choice(
        ["stampa3d", "consulenza", "sviluppoSoftware", "atlas", "altro"],
        { immutable: true },
      ),
      variant: f.text(100, { immutable: true }),
      actor: actor(),
    },
    [
      unique("order_revenue", { shopId: 1, orderId: 1 }),
      unique("principal_revenue", { revenueId: 1 }),
    ],
    { appendOnly: true, validate: (doc) => validateTotals(doc.totals) },
  );
  const providerScope = {
    provider: f.choice(["stripe", "paypal"], { immutable: true }),
    merchantId: f.text(200, { immutable: true }),
    mode: f.choice(["test", "live"], { immutable: true }),
  };
  const workFields = () => ({
    nextReconcileAt: f.date(opt),
    workLease: f.object({ token: f.text(100), expiresAt: f.date() }, opt),
    lastErrorCode: f.text(80, opt),
    reviewCode: f.text(80, opt),
  });
  add(
    "paymentRequests",
    {
      accountId: immutableId(),
      orderId: immutableId(),
      paymentAttemptId: immutableId(),
      keyHash: digest({ immutable: true }),
      requestHash: digest({ immutable: true }),
    },
    [unique("payment_request_once", { shopId: 1, accountId: 1, keyHash: 1 })],
    { appendOnly: true },
  );
  add(
    "paymentReceipts",
    {
      ...providerScope,
      orderId: immutableId(),
      paymentAttemptId: immutableId(),
      revenueId: immutableId(),
      providerPaymentId: f.text(250, { immutable: true }),
      providerChargeId: f.text(250, { immutable: true }),
      amountMinor: f.integer(1_000_000_000_000, { min: 1, immutable: true }),
      currency: f.choice(["EUR"], { immutable: true }),
      paidAt: f.date({ immutable: true }),
    },
    [
      unique("payment_receipt_provider", {
        provider: 1,
        merchantId: 1,
        mode: 1,
        providerPaymentId: 1,
      }),
      unique("one_payment_receipt_order", { shopId: 1, orderId: 1 }),
    ],
    { appendOnly: true },
  );
  add(
    "refundReceipts",
    {
      ...providerScope,
      orderId: immutableId(),
      paymentAttemptId: immutableId(),
      adjustmentRevenueId: immutableId(),
      providerRefundId: f.text(250, { immutable: true }),
      amountMinor: f.integer(1_000_000_000_000, { min: 1, immutable: true }),
      netMinor: f.integer(1_000_000_000_000, { immutable: true }),
      taxMinor: f.integer(1_000_000_000_000, { immutable: true }),
      currency: f.choice(["EUR"], { immutable: true }),
      confirmedAt: f.date({ immutable: true }),
    },
    [
      unique("refund_receipt_provider", {
        provider: 1,
        merchantId: 1,
        mode: 1,
        providerRefundId: 1,
      }),
      unique("refund_adjustment_revenue", { adjustmentRevenueId: 1 }),
      index("order_refund_receipts", { shopId: 1, orderId: 1 }),
    ],
    {
      appendOnly: true,
      validate: (doc) =>
        assertInvariant(
          doc.netMinor + doc.taxMinor === doc.amountMinor,
          "REFUND_TOTALS",
        ),
    },
  );
  add(
    "paymentAttempts",
    {
      publicId: publicId(),
      orderId: immutableId(),
      accountId: immutableId(),
      ...providerScope,
      providerSessionId: f.text(250, opt),
      providerPaymentId: f.text(250, opt),
      providerIdempotencyKey: f.text(200, { immutable: true }),
      checkoutSpec: f.object(
        {
          returnOrigin: f.text(300),
          methods: f.array(f.choice(["card", "paypal"]), 2, { min: 1 }),
          apiVersion: f.choice(["2026-10-28.endive"]),
        },
        { ...opt, immutable: true },
      ),
      orderHash: digest({ ...opt, immutable: true }),
      creationDeadline: f.date({ ...opt, immutable: true }),
      creationStartedAt: f.date(opt),
      ...workFields(),
      cancellationRequested: f.boolean(opt),
      verifiedPaidAt: f.date(opt),
      providerChargeId: f.text(250, opt),
      refundedMinor: f.integer(1_000_000_000_000, opt),
      amountMinor: f.integer(1_000_000_000_000, { min: 1, immutable: true }),
      currency: f.choice(["EUR"], { immutable: true }),
      active: f.boolean({ default: true }),
      state: f.choice([
        "creating",
        "ready",
        "processing",
        "paid",
        "failed",
        "expired",
        "cancelled",
        "under_review",
      ]),
      expiresAt: f.date(opt),
      paidAt: f.date(opt),
      method: f.text(80, opt),
    },
    [
      publicKey("attempt_public_id"),
      unique("one_active_attempt", { shopId: 1, orderId: 1 }, { active: true }),
      unique("provider_idempotency", {
        provider: 1,
        merchantId: 1,
        mode: 1,
        providerIdempotencyKey: 1,
      }),
      unique(
        "provider_session",
        { provider: 1, merchantId: 1, mode: 1, providerSessionId: 1 },
        { providerSessionId: { $type: "string" } },
      ),
      unique(
        "provider_payment",
        { provider: 1, merchantId: 1, mode: 1, providerPaymentId: 1 },
        { providerPaymentId: { $type: "string" } },
      ),
      index("order_payments", { shopId: 1, orderId: 1, createdAt: -1 }),
    ],
    {
      validate: (doc) =>
        assertInvariant(
          !["paid", "failed", "expired", "cancelled"].includes(doc.state) ||
            !doc.active,
          "TERMINAL_ATTEMPT",
        ),
    },
  );
  add(
    "paymentEvents",
    {
      ...providerScope,
      providerEventId: f.text(250, { immutable: true }),
      eventType: f.text(150, { immutable: true }),
      bodyHash: digest({ immutable: true }),
      providerObjectId: f.text(250, { immutable: true }),
      signatureVerifiedAt: f.date({ immutable: true }),
      // Only verified references; no raw webhook, card information or client-provided "paid" flag.
      ...jobFields(),
    },
    [
      unique("provider_event", {
        provider: 1,
        merchantId: 1,
        mode: 1,
        providerEventId: 1,
      }),
      ...jobIndexes(),
    ],
  );
  add(
    "refunds",
    {
      publicId: publicId(),
      orderId: immutableId(),
      paymentAttemptId: immutableId(),
      sourceCommandId: immutableId(),
      ...providerScope,
      providerPaymentId: f.text(250, { ...opt, immutable: true }),
      recoveryDeadline: f.date({ ...opt, immutable: true }),
      creationStartedAt: f.date(opt),
      ...workFields(),
      amountMinor: f.integer(1_000_000_000_000, { min: 1, immutable: true }),
      currency: f.choice(["EUR"], { immutable: true }),
      providerIdempotencyKey: f.text(200, { immutable: true }),
      providerRefundId: f.text(250, opt),
      state: f.choice([
        "requested",
        "processing",
        "succeeded",
        "failed",
        "cancelled",
        "under_review",
      ]),
      reasonCode: f.text(80),
      actor: actor(),
    },
    [
      publicKey("refund_public_id"),
      unique("refund_command", { shopId: 1, sourceCommandId: 1 }),
      unique("refund_idempotency", {
        provider: 1,
        merchantId: 1,
        mode: 1,
        providerIdempotencyKey: 1,
      }),
      unique(
        "provider_refund",
        { provider: 1, merchantId: 1, mode: 1, providerRefundId: 1 },
        { providerRefundId: { $type: "string" } },
      ),
    ],
  );
  add(
    "staffCommandInbox",
    {
      publicId: publicId(),
      staffId: immutableId(),
      capability: f.choice(Object.values(STAFF_COMMAND_CAPABILITIES)),
      kind: f.choice(Object.keys(STAFF_COMMANDS), { immutable: true }),
      idempotencyKeyHash: digest({ immutable: true }),
      requestHash: digest({ immutable: true }),
      requestId: f.text(100, { immutable: true }),
      payload: f.object(
        Object.fromEntries(
          Object.entries(STAFF_COMMANDS).map(([kind, fields]) => [
            kind,
            f.object(fields, opt),
          ]),
        ),
        { immutable: true },
      ),
    },
    [
      publicKey("staff_command_public_id"),
      unique("staff_idempotency", {
        shopId: 1,
        staffId: 1,
        kind: 1,
        idempotencyKeyHash: 1,
      }),
    ],
    {
      appendOnly: true,
      validate: (doc) =>
        assertInvariant(
          Object.keys(doc.payload).length === 1 &&
            !!doc.payload[doc.kind] &&
            doc.capability === STAFF_COMMAND_CAPABILITIES[doc.kind],
          "STAFF_COMMAND",
        ),
    },
  );
  add(
    "operations",
    {
      publicId: publicId(),
      channel: f.choice(["customer", "staff", "provider"], { immutable: true }),
      commandId: immutableId(),
      commandHash: digest({ immutable: true }),
      accountId: f.id(opt),
      ...jobFields(),
      result: f.object(
        {
          orderId: f.id(opt),
          quoteId: f.id(opt),
          paymentAttemptId: f.id(opt),
          errorCode: f.text(80, opt),
        },
        opt,
      ),
    },
    [
      publicKey("operation_public_id"),
      unique("command_operation", { shopId: 1, channel: 1, commandId: 1 }),
      ...jobIndexes(),
    ],
  );
  add(
    "outbox",
    {
      kind: f.choice([
        "order_created",
        "payment_receipt",
        "checkout_create",
        "catalog_publish",
        "tracking_publish",
      ]),
      deduplicationKey: digest({ immutable: true }),
      aggregateId: immutableId(),
      aggregateRevision: f.integer(),
      ...jobFields(),
    },
    [
      unique("outbox_effect", { shopId: 1, kind: 1, deduplicationKey: 1 }),
      ...jobIndexes(),
    ],
  );
  add(
    "auditEvents",
    {
      actor: actor(),
      action: f.text(100),
      objectType: f.text(80),
      objectId: f.text(100),
      outcome: f.choice(["accepted", "rejected", "succeeded", "failed"]),
      reasonCode: f.text(80, opt),
      occurredAt: f.date(),
    },
    [
      index("object_audit", {
        shopId: 1,
        objectType: 1,
        objectId: 1,
        occurredAt: -1,
      }),
      index("request_audit", { shopId: 1, "actor.requestId": 1 }),
    ],
    { appendOnly: true },
  );
  add(
    "counters",
    {
      key: f.text(80, { immutable: true }),
      value: f.integer(Number.MAX_SAFE_INTEGER, { default: 0 }),
    },
    [unique("counter_key", { shopId: 1, key: 1 })],
  );
  const result = Object.freeze({
    definitions: Object.freeze(definitions),
    models: Object.freeze(
      Object.fromEntries(
        Object.entries(definitions).map(([key, definition]) => [
          key,
          definition.model,
        ]),
      ),
    ),
  });
  cache.set(connection, result);
  return result;
}
