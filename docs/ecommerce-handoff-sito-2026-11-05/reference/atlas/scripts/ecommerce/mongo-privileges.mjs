// Returns role privilege DOCUMENTS only. Does not create roles/users or connect to MongoDB.
import { STOREFRONT_COLLECTIONS } from "@evolve/ecommerce-server/identity";
import { INTERNAL_COLLECTIONS } from "../../src/server-utils/ecommerce/persistence/internal-models.mjs";
import {
  CORE_COMMERCE_COLLECTIONS,
  CORE_FULFILLMENT_COLLECTIONS,
  CUSTOMER_REGISTRY_COLLECTION,
} from "../../src/server-utils/ecommerce/persistence/core-indexes.mjs";

const privilege = (db, collection, actions) => ({
  resource: { db, collection },
  actions,
});
const names = STOREFRONT_COLLECTIONS;
function assertDatabaseName(name) {
  if (typeof name !== "string" || !/^[A-Za-z0-9_-]{1,63}$/.test(name))
    throw new Error("COMMERCE_DATABASE_NAME_REQUIRED");
}
export function storefrontPrivileges(commerceDb) {
  assertDatabaseName(commerceDb);
  const writable = [
    names.accounts,
    names.accountProfiles,
    names.sessions,
    names.authTokens,
    names.authStates,
    names.sessionAccess,
    names.authRateLimits,
    names.authDeliveries,
  ];
  const views = [names.orderViews, names.operationViews];
  return [
    ...writable.map((collection) =>
      privilege(commerceDb, collection, [
        "find",
        "insert",
        "update",
        "listIndexes",
      ]),
    ),
    privilege(commerceDb, names.accountAccess, [
      "find",
      "insert",
      "listIndexes",
    ]),
    privilege(commerceDb, names.commandInbox, ["insert", "listIndexes"]),
    privilege(commerceDb, names.registrationProfiles, [
      "find",
      "insert",
      "listIndexes",
    ]),
    privilege(commerceDb, names.authAudit, ["insert", "listIndexes"]),
    privilege(commerceDb, names.identityEvents, ["insert", "listIndexes"]),
    privilege(commerceDb, names.carts, ["listIndexes"]),
    privilege(commerceDb, names.commandReceipts, [
      "find",
      "insert",
      "listIndexes",
    ]),
    ...views.map((collection) =>
      privilege(commerceDb, collection, ["find", "listIndexes"]),
    ),
    // Catalog and tracking content require their OIDC reader and current publication checks.
    ...[names.catalogViews, names.productPageViews, names.trackingViews].map(
      (collection) => privilege(commerceDb, collection, ["listIndexes"]),
    ),
  ];
}
// Add to an ordinary Atlas runtime role only if it does not already have core-db readWrite.
// No access to commerce/private data is required by the ordinary customer writers.
export function atlasCustomerRegistryPrivileges(coreDb) {
  assertDatabaseName(coreDb);
  return [
    privilege(coreDb, CUSTOMER_REGISTRY_COLLECTION, [
      "find",
      "insert",
      "update",
      "createCollection",
    ]),
  ];
}
export function processorPrivileges(coreDb, commerceDb) {
  assertDatabaseName(coreDb);
  assertDatabaseName(commerceDb);
  if (coreDb === commerceDb)
    throw new Error("COMMERCE_DATABASE_MUST_BE_SEPARATE");
  const views = [
    names.catalogViews,
    names.productPageViews,
    names.orderViews,
    names.trackingViews,
    names.operationViews,
  ];
  const immutableInternal = new Set([
    INTERNAL_COLLECTIONS.staffCommandInbox,
    INTERNAL_COLLECTIONS.auditEvents,
    INTERNAL_COLLECTIONS.revenueLinks,
    INTERNAL_COLLECTIONS.identityReceipts,
    INTERNAL_COLLECTIONS.quoteRequests,
    INTERNAL_COLLECTIONS.orderRequests,
    INTERNAL_COLLECTIONS.paymentRequests,
    INTERNAL_COLLECTIONS.paymentReceipts,
    INTERNAL_COLLECTIONS.refundReceipts,
    INTERNAL_COLLECTIONS.requestClaims,
    INTERNAL_COLLECTIONS.fulfillmentRequests,
    INTERNAL_COLLECTIONS.workflowTransitions,
  ]);
  return [
    // Additive initialization belongs to Atlas only, restricted to named collections.
    ...Object.values(CORE_FULFILLMENT_COLLECTIONS).map((collection) =>
      privilege(coreDb, collection, [
        "find",
        "insert",
        "update",
        "createCollection",
        "createIndex",
        "listIndexes",
      ]),
    ),
    ...Object.values(names).map((collection) =>
      privilege(commerceDb, collection, ["createCollection", "createIndex"]),
    ),
    ...Object.values(INTERNAL_COLLECTIONS).map((collection) =>
      privilege(commerceDb, collection, ["createCollection", "createIndex"]),
    ),
    ...Object.values(CORE_COMMERCE_COLLECTIONS).map((collection) =>
      privilege(coreDb, collection, ["createCollection", "createIndex"]),
    ),
    ...Object.values(names)
      .filter(
        (collection) =>
          ![
            names.accountAccess,
            names.authStates,
            names.sessionAccess,
            names.carts,
            ...views,
          ].includes(collection),
      )
      .map((collection) =>
        privilege(
          commerceDb,
          collection,
          [
            names.accountProfiles,
            names.commandInbox,
            names.commandReceipts,
            names.identityEvents,
          ].includes(collection)
            ? ["find", "listIndexes"]
            : collection === names.authAudit
              ? ["find", "insert", "listIndexes"]
              : ["listIndexes"],
        ),
      ),
    ...[names.accountAccess, names.authStates, names.sessionAccess].map(
      (collection) =>
        privilege(commerceDb, collection, ["find", "update", "listIndexes"]),
    ),
    privilege(commerceDb, names.carts, [
      "find",
      "insert",
      "update",
      "listIndexes",
    ]),
    ...views.map((collection) =>
      privilege(commerceDb, collection, [
        "find",
        "insert",
        "update",
        "remove",
        "listIndexes",
      ]),
    ),
    ...Object.values(INTERNAL_COLLECTIONS).map((collection) =>
      privilege(
        commerceDb,
        collection,
        immutableInternal.has(collection)
          ? ["find", "insert", "listIndexes"]
          : ["find", "insert", "update", "listIndexes"],
      ),
    ),
    privilege(coreDb, CORE_COMMERCE_COLLECTIONS.customers, [
      "find",
      "insert",
      "listIndexes",
    ]),
    ...atlasCustomerRegistryPrivileges(coreDb),
    privilege(coreDb, CORE_COMMERCE_COLLECTIONS.revenues, [
      "find",
      "insert",
      "update",
      "listIndexes",
    ]),
    privilege(coreDb, "anagrafiche__articoli", ["find", "update"]),
  ];
}
