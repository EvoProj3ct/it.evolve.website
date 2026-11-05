import { STOREFRONT_COLLECTIONS as names } from "./collections.js";
import {
  field as f,
  defineCommerceModel,
  unique,
  index,
  publicId,
  digest,
  optional as opt,
  assertInvariant,
} from "./schema-kit.js";
import {
  address,
  billing,
  lines,
  totals,
  taxPrice,
  content,
  operationalStatus,
  paymentStatus,
  fulfillmentStatus,
  expectation,
  validateExpectation,
  validateLineSnapshots,
} from "./data-shapes.js";

const cache = new WeakMap();
const accountKey = (name) => unique(name, { shopId: 1, accountId: 1 });
const publicKey = (name) => unique(name, { shopId: 1, publicId: 1 });
const account = () => f.id({ immutable: true });
const expires = () => f.date();
const ttl = () =>
  index("cleanup_expired", { expiresAt: 1 }, { expireAfterSeconds: 0 });

// The site may submit only these requests. No customer/revenue IDs, amounts, staff authority or refunds.
export const PUBLIC_COMMANDS = Object.freeze({
  link_customer: {},
  create_quote: {
    cartPublicId: publicId(),
    cartRevision: f.integer(),
    billing: billing(),
    shipping: { ...address(), ...opt },
    deliveryOptionPublicId: publicIdOptional(),
  },
  confirm_order: { quotePublicId: publicId(), termsVersion: f.text(80) },
  start_payment: { orderPublicId: publicId(), expectedRevision: f.integer() },
  cancel_order: { orderPublicId: publicId(), expectedRevision: f.integer() },
});
function publicIdOptional() {
  return { ...publicId(), ...opt };
}

function commandPayloadFields() {
  return Object.fromEntries(
    Object.entries(PUBLIC_COMMANDS).map(([kind, fields]) => [
      kind,
      f.object(fields, opt),
    ]),
  );
}
function validatePublicCommand(doc) {
  const keys = Object.keys(doc.payload || {});
  assertInvariant(keys.length === 1 && keys[0] === doc.kind, "COMMAND_PAYLOAD");
}

export function buildStorefrontModels(connection) {
  if (cache.has(connection)) return cache.get(connection);
  const definitions = {};
  const add = (key, fields, indexes, options) => {
    definitions[key] = defineCommerceModel(
      connection,
      names[key],
      fields,
      indexes,
      options,
    );
  };
  add(
    "accounts",
    {
      publicId: { ...publicId(), ...opt },
      emailNormalized: f.text(254),
      passwordHash: f.text(512, { secret: true }),
      status: f.choice(
        ["pending_verification", "active", "suspended", "closed"],
        { default: "pending_verification" },
      ),
      verifiedAt: f.date(opt),
      credentialVersion: f.integer(Number.MAX_SAFE_INTEGER, { default: 0 }),
    },
    [
      unique("shop_email", { shopId: 1, emailNormalized: 1 }),
      unique(
        "account_public_id",
        { shopId: 1, publicId: 1 },
        { publicId: { $type: "string" } },
      ),
    ],
    {
      validate: (doc) =>
        assertInvariant(
          doc.status !== "active" || !!doc.verifiedAt,
          "ACCOUNT_VERIFIED",
        ),
    },
  );
  add(
    "accountProfiles",
    {
      accountId: account(),
      verifiedEmail: f.text(254),
      verifiedAt: f.date(),
      displayName: f.text(200, opt),
      phone: f.text(40, opt),
      kind: f.choice(["individual", "company"]),
    },
    [accountKey("shop_account")],
  );
  add(
    "accountAccess",
    {
      accountId: account(),
      status: f.choice(["active", "suspended", "closed"]),
      accessVersion: f.integer(),
      guard: f.integer(Number.MAX_SAFE_INTEGER, { default: 0 }),
      reasonCode: f.text(80, opt),
    },
    [accountKey("shop_account")],
  );
  add(
    "authStates",
    {
      accountId: account(),
      status: f.choice([
        "pending_verification",
        "active",
        "suspended",
        "closed",
      ]),
      credentialVersion: f.integer(),
      verifiedAt: f.date(opt),
      guard: f.integer(Number.MAX_SAFE_INTEGER, { default: 0 }),
    },
    [accountKey("auth_state_account")],
  );
  add(
    "sessionAccess",
    {
      sessionId: f.id({ immutable: true }),
      accountId: account(),
      publicKey: f.text(100, {
        immutable: true,
        pattern: "^[A-Za-z0-9_-]{59}$",
      }),
      credentialVersion: f.integer(),
      accessVersion: f.integer(),
      expiresAt: f.date(),
      absoluteExpiresAt: f.date(),
      revokedAt: f.date(opt),
      guard: f.integer(Number.MAX_SAFE_INTEGER, { default: 0 }),
    },
    [
      unique("session_access_id", { shopId: 1, sessionId: 1 }),
      index("session_access_account", { shopId: 1, accountId: 1 }),
      ttl(),
    ],
  );
  add(
    "sessions",
    {
      accountId: account(),
      tokenHash: digest({ secret: true, immutable: true }),
      credentialVersion: f.integer(),
      accessVersion: f.integer(),
      expiresAt: expires(),
      absoluteExpiresAt: f.date({ immutable: true }),
      lastSeenAt: f.date(),
      revokedAt: f.date(opt),
    },
    [
      unique("session_hash", { tokenHash: 1 }),
      index("account_sessions", { shopId: 1, accountId: 1 }),
      ttl(),
    ],
    {
      validate: (doc) =>
        assertInvariant(
          doc.expiresAt <= doc.absoluteExpiresAt &&
            doc.lastSeenAt <= doc.absoluteExpiresAt,
          "SESSION_EXPIRY",
        ),
    },
  );
  add(
    "authTokens",
    {
      accountId: account(),
      tokenHash: digest({ secret: true, immutable: true }),
      purpose: f.choice(["verify_email", "reset_password", "change_email"], {
        immutable: true,
      }),
      accessVersion: f.integer(Number.MAX_SAFE_INTEGER, opt),
      credentialVersion: f.integer(),
      targetEmail: f.text(254, opt),
      expiresAt: expires(),
      consumedAt: f.date(opt),
    },
    [
      unique("token_hash", { tokenHash: 1 }),
      index("account_tokens", { shopId: 1, accountId: 1, purpose: 1 }),
      ttl(),
    ],
  );
  add(
    "registrationProfiles",
    {
      accountId: account(),
      displayName: f.text(200),
      kind: f.choice(["individual", "company"]),
      termsVersion: f.text(80),
      privacyVersion: f.text(80),
      acceptedAt: f.date(),
    },
    [accountKey("registration_account")],
    { appendOnly: true },
  );
  add(
    "authRateLimits",
    {
      keyHash: digest({ immutable: true }),
      window: f.integer(),
      count: f.integer(10000000, { default: 0 }),
      expiresAt: f.date(),
    },
    [unique("rate_window", { shopId: 1, keyHash: 1, window: 1 }), ttl()],
  );
  add(
    "authDeliveries",
    {
      publicId: publicId(),
      accountId: account(),
      kind: f.choice(
        [
          "verify_email",
          "reset_password",
          "change_email",
          "email_changed_notice",
          "password_changed_notice",
        ],
        { immutable: true },
      ),
      tokenId: f.id(opt),
      credentialVersion: f.integer(),
      envelope: f.object(
        {
          keyId: f.text(40),
          iv: f.text(16),
          ciphertext: f.text(10000),
          tag: f.text(22),
        },
        { ...opt, secret: true },
      ),
      state: f.choice(["pending", "running", "sent", "dead"], {
        default: "pending",
      }),
      attempts: f.integer(10, { default: 0 }),
      availableAt: f.date(),
      deliverBy: f.date(),
      expiresAt: f.date(),
      leaseToken: f.text(100, opt),
      leaseUntil: f.date(opt),
      providerId: f.text(200, opt),
      lastErrorCode: f.text(80, opt),
    },
    [
      publicKey("auth_delivery_id"),
      index("auth_delivery_ready", { shopId: 1, state: 1, availableAt: 1 }),
      ttl(),
    ],
  );
  add(
    "authAudit",
    {
      accountId: f.id(opt),
      event: f.choice([
        "registered",
        "verified",
        "login_succeeded",
        "login_failed",
        "logout",
        "logout_all",
        "password_reset",
        "password_changed",
        "email_changed",
        "profile_changed",
        "access_suspended",
        "access_restored",
      ]),
      actorKind: f.choice(["anonymous", "customer", "staff", "system"]),
      actorId: f.text(100, opt),
      requestId: f.text(100),
      outcome: f.choice(["accepted", "succeeded", "rejected"]),
      networkHash: digest(opt),
      occurredAt: f.date(),
      expiresAt: f.date(),
    },
    [
      index("account_auth_audit", { shopId: 1, accountId: 1, occurredAt: -1 }),
      ttl(),
    ],
    { appendOnly: true },
  );
  add(
    "identityEvents",
    {
      publicId: publicId(),
      accountId: account(),
      kind: f.choice(["account_verified", "email_changed"], {
        immutable: true,
      }),
      profileRevision: f.integer(),
      requestId: f.text(100),
    },
    [
      publicKey("identity_event_id"),
      unique("identity_profile_event", {
        shopId: 1,
        accountId: 1,
        profileRevision: 1,
        kind: 1,
      }),
    ],
    { appendOnly: true },
  );
  add(
    "carts",
    {
      publicId: publicId(),
      accountId: account(),
      status: f.choice(["active", "converted", "expired"], {
        default: "active",
      }),
      items: f.array(
        f.object({
          productPublicId: publicId(),
          listingRevision: f.integer(Number.MAX_SAFE_INTEGER, opt),
          quantity: f.integer(1000, { min: 1 }),
        }),
        100,
        { default: [] },
      ),
      expiresAt: expires(),
      convertedOrderPublicId: publicIdOptional(),
    },
    [
      publicKey("cart_public_id"),
      unique(
        "one_active_cart",
        { shopId: 1, accountId: 1 },
        { status: "active" },
      ),
      ttl(),
    ],
    {
      validate: (doc) =>
        assertInvariant(
          new Set(doc.items.map((item) => item.productPublicId)).size ===
            doc.items.length,
          "DUPLICATE_CART_PRODUCT",
        ),
    },
  );
  add(
    "commandInbox",
    {
      publicId: publicId(),
      accountId: account(),
      sessionId: f.id({ immutable: true }),
      kind: f.choice(Object.keys(PUBLIC_COMMANDS), { immutable: true }),
      accessVersion: f.integer(),
      idempotencyKeyHash: digest({ immutable: true }),
      requestHash: digest({ immutable: true }),
      requestId: f.text(100, { immutable: true }),
      payload: f.object(commandPayloadFields(), { immutable: true }),
    },
    [
      publicKey("command_public_id"),
      unique("customer_idempotency", {
        shopId: 1,
        accountId: 1,
        kind: 1,
        idempotencyKeyHash: 1,
      }),
      index("commands_created", { shopId: 1, createdAt: 1 }),
    ],
    {
      appendOnly: true,
      validate: validatePublicCommand,
    },
  );
  // Immutable submission receipt, separate from payload and worker state. The site can deduplicate without reading its inbox.
  add(
    "commandReceipts",
    {
      publicId: publicId(),
      accountId: account(),
      kind: f.choice(Object.keys(PUBLIC_COMMANDS), { immutable: true }),
      idempotencyKeyHash: digest({ immutable: true }),
      requestHash: digest({ immutable: true }),
    },
    [
      publicKey("receipt_public_id"),
      unique("receipt_idempotency", {
        shopId: 1,
        accountId: 1,
        kind: 1,
        idempotencyKeyHash: 1,
      }),
    ],
    { appendOnly: true },
  );
  const catalogFields = {
    publicId: publicId(),
    slug: f.text(160, { pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
    publishedRevision: f.integer(),
    title: f.text(200),
    code: f.text(100),
    kind: f.choice(["physical", "service"]),
    price: taxPrice(),
    fulfillmentModes: f.array(f.choice(["shipping", "pickup", "service"]), 3, {
      min: 1,
    }),
    publishedAt: f.date(),
  };
  add("catalogViews", catalogFields, [
    publicKey("catalog_public_id"),
    unique("catalog_slug", { shopId: 1, slug: 1 }),
  ]);
  add("productPageViews", { ...catalogFields, content: content() }, [
    publicKey("product_page_public_id"),
    unique("product_page_slug", { shopId: 1, slug: 1 }),
  ]);
  add(
    "orderViews",
    {
      publicId: publicId(),
      accountId: account(),
      number: f.text(80),
      operationalStatus: operationalStatus(),
      paymentStatus: paymentStatus(),
      fulfillmentStatus: fulfillmentStatus(),
      lines: lines(),
      totals: totals(),
      billing: billing(),
      shipping: { ...address(), ...opt },
      placedAt: f.date(),
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
    },
    [
      publicKey("order_view_public_id"),
      index("account_orders", { shopId: 1, accountId: 1, placedAt: -1 }),
    ],
    { validate: validateLineSnapshots },
  );
  add(
    "operationViews",
    {
      publicId: publicId(),
      accountId: account(),
      status: f.choice(["pending", "processing", "succeeded", "failed"]),
      result: f.object(
        {
          orderPublicId: publicIdOptional(),
          quotePublicId: publicIdOptional(),
          errorCode: f.text(80, opt),
          retryable: f.boolean(opt),
        },
        opt,
      ),
    },
    [
      publicKey("operation_view_public_id"),
      index("account_operations", { shopId: 1, accountId: 1, createdAt: -1 }),
    ],
  );
  add(
    "trackingViews",
    {
      publicId: publicId(),
      accountId: account(),
      orderPublicId: publicId(),
      phase: f.text(100),
      fulfillmentStatus: { ...fulfillmentStatus(), ...opt },
      sourceRevision: f.integer(Number.MAX_SAFE_INTEGER, opt),
      publicationVersion: f.integer(Number.MAX_SAFE_INTEGER, opt),
      publishedAt: f.date(opt),
      contentHash: digest(opt),
      expected: expectation(),
      deliveries: f.array(
        f.object({
          publicId: publicId(),
          label: f.text(200),
          mode: f.choice(["shipping", "pickup", "service"], opt),
          message: f.text(3000, opt),
          shippedAt: f.date(opt),
          phase: f.text(100),
          expected: expectation(),
          completedAt: f.date(opt),
          lines: f.array(
            f.object({
              lineId: publicId(),
              title: f.text(200, opt),
              quantity: f.integer(1000, { min: 1 }),
            }),
            100,
            { min: 1 },
          ),
        }),
        100,
      ),
      events: f.array(
        f.object({
          publicId: publicId(),
          deliveryPublicId: publicIdOptional(),
          kind: f.choice(["delivery", "progress"]),
          title: f.text(200),
          text: f.text(3000, opt),
          status: f.choice(["planned", "completed", "cancelled"]),
          scheduled: expectation(),
          occurredAt: f.date(opt),
        }),
        500,
      ),
    },
    [
      publicKey("tracking_public_id"),
      unique("order_tracking", { shopId: 1, orderPublicId: 1 }),
      index("account_tracking", { shopId: 1, accountId: 1, orderPublicId: 1 }),
    ],
    {
      validate: (doc) => {
        validateExpectation(doc.expected);
        for (const delivery of doc.deliveries)
          validateExpectation(delivery.expected);
        for (const event of doc.events) validateExpectation(event.scheduled);
      },
    },
  );
  const result = Object.freeze({
    definitions: Object.freeze(definitions),
    models: Object.freeze(
      Object.fromEntries(
        Object.entries(definitions).map(([key, def]) => [key, def.model]),
      ),
    ),
  });
  cache.set(connection, result);
  return result;
}
