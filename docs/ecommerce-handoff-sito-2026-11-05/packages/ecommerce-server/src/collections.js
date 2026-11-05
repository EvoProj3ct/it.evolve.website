/** Collezioni visibili alla credenziale del sito; nessun modello gestionale. */
export const STOREFRONT_COLLECTIONS = Object.freeze({
  accounts: "commerce_accounts",
  accountProfiles: "commerce_account_profiles",
  accountAccess: "commerce_account_access",
  authStates: "commerce_auth_states",
  sessionAccess: "commerce_session_access",
  sessions: "commerce_sessions",
  authTokens: "commerce_auth_tokens",
  registrationProfiles: "commerce_registration_profiles",
  authRateLimits: "commerce_auth_rate_limits",
  authDeliveries: "commerce_auth_deliveries",
  authAudit: "commerce_auth_audit",
  identityEvents: "commerce_identity_events",
  carts: "commerce_carts",
  commandInbox: "commerce_command_inbox",
  commandReceipts: "commerce_command_receipts",
  catalogViews: "commerce_catalog_views",
  productPageViews: "commerce_product_page_views",
  orderViews: "commerce_order_views",
  trackingViews: "commerce_tracking_views",
  operationViews: "commerce_operation_views",
});

// Le credenziali Mongo devono imporre gli stessi limiti, oltre al controllo applicativo.
const writable = new Set([
  STOREFRONT_COLLECTIONS.accounts,
  STOREFRONT_COLLECTIONS.accountProfiles,
  STOREFRONT_COLLECTIONS.sessions,
  STOREFRONT_COLLECTIONS.authTokens,
  STOREFRONT_COLLECTIONS.authStates,
  STOREFRONT_COLLECTIONS.sessionAccess,
  STOREFRONT_COLLECTIONS.authRateLimits,
  STOREFRONT_COLLECTIONS.authDeliveries,
]);
const readable = new Set(
  Object.values(STOREFRONT_COLLECTIONS).filter(
    (name) =>
      ![
        STOREFRONT_COLLECTIONS.commandInbox,
        STOREFRONT_COLLECTIONS.catalogViews,
        STOREFRONT_COLLECTIONS.productPageViews,
        STOREFRONT_COLLECTIONS.trackingViews,
        STOREFRONT_COLLECTIONS.authAudit,
        STOREFRONT_COLLECTIONS.identityEvents,
        STOREFRONT_COLLECTIONS.carts,
      ].includes(name),
  ),
);

export function assertStorefrontCollectionAccess(collection, operation) {
  const allowed =
    operation === "find"
      ? readable.has(collection)
      : operation === "insert"
        ? writable.has(collection) ||
          collection === STOREFRONT_COLLECTIONS.commandReceipts ||
          collection === STOREFRONT_COLLECTIONS.registrationProfiles ||
          collection === STOREFRONT_COLLECTIONS.authAudit ||
          collection === STOREFRONT_COLLECTIONS.identityEvents ||
          collection === STOREFRONT_COLLECTIONS.accountAccess ||
          collection === STOREFRONT_COLLECTIONS.commandInbox
        : operation === "update" && writable.has(collection);
  if (!allowed) throw new Error("STOREFRONT_COLLECTION_ACCESS_DENIED");
}
