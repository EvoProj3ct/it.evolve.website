// Additive initialization only: no document backfills, validators, drops or version markers.
// Also used by ordinary customer writers; no Next-only dependency or connection on import.
import type { Connection } from "mongoose";
import {
  assertCommerceStorageReady,
  assertTransactionsSupported,
  type CommerceIndex,
  type CommerceModelSet,
} from "@evolve/ecommerce-server/persistence";
import {
  CORE_COMMERCE_COLLECTIONS,
  CORE_COMMERCE_INDEX,
  CORE_FULFILLMENT_COLLECTIONS,
  CORE_FULFILLMENT_EVENT_INDEXES,
  CUSTOMER_REGISTRY_COLLECTION,
} from "./core-indexes.mjs";

const registryChecks = new WeakMap<Connection, Promise<void>>();
export const coreCommerceStorageDefinitions = {
  ...Object.fromEntries(
    Object.entries({
      ...CORE_COMMERCE_COLLECTIONS,
      deliveries: CORE_FULFILLMENT_COLLECTIONS.deliveries,
    }).map(([key, collection]) => [
      key,
      { collection, indexes: [CORE_COMMERCE_INDEX as CommerceIndex] },
    ]),
  ),
  ...Object.fromEntries(
    [
      CORE_FULFILLMENT_COLLECTIONS.deliveryEvents,
      CORE_FULFILLMENT_COLLECTIONS.progressEvents,
    ].map((collection) => [
      collection,
      {
        collection,
        indexes: CORE_FULFILLMENT_EVENT_INDEXES as CommerceIndex[],
      },
    ]),
  ),
};
const writeConcern = { w: "majority" as const, wtimeoutMS: 10000 };
const errorCode = (error: unknown) => (error as { code?: number })?.code;

async function ensureCollection(connection: Connection, name: string) {
  if (!connection.db) throw new Error("COMMERCE_DATABASE_NOT_CONNECTED");
  try {
    await connection.db.createCollection(name, { writeConcern });
  } catch (error) {
    // Two Vercel instances can initialize the same collection concurrently.
    if (errorCode(error) !== 48) throw error;
  }
}

export async function ensureCustomerRegistry(connection: Connection) {
  if (!registryChecks.has(connection)) {
    const check = (async () => {
      await ensureCollection(connection, CUSTOMER_REGISTRY_COLLECTION);
      const registry = connection.db!.collection<{
        _id: string;
        revision: number;
        updatedAt: Date;
      }>(CUSTOMER_REGISTRY_COLLECTION);
      try {
        await registry.updateOne(
          { _id: "customers" },
          { $setOnInsert: { revision: 0, updatedAt: new Date() } },
          { upsert: true, writeConcern },
        );
      } catch (error) {
        // A concurrent initializer may already have inserted the singleton.
        if (errorCode(error) !== 11000) throw error;
      }
      const existing = await registry.findOne({ _id: "customers" });
      if (
        !existing ||
        !Number.isSafeInteger(existing.revision) ||
        existing.revision < 0 ||
        !(existing.updatedAt instanceof Date) ||
        !Number.isFinite(existing.updatedAt.getTime())
      )
        throw new Error("COMMERCE_CUSTOMER_REGISTRY_NOT_READY");
    })().catch((error) => {
      registryChecks.delete(connection);
      throw error;
    });
    registryChecks.set(connection, check);
  }
  await registryChecks.get(connection);
}

/** Atlas only. Called before opening a commerce transaction, once per connection/index set. */
export async function initializeCommerceStorage(
  core: Connection,
  commerce: Connection,
  definitions: CommerceModelSet["definitions"],
) {
  if (
    !core.db ||
    !commerce.db ||
    core.getClient() !== commerce.getClient() ||
    core.name === commerce.name
  )
    throw new Error("COMMERCE_SHARED_CLIENT_AND_SEPARATE_DB_REQUIRED");
  await assertTransactionsSupported(core);
  await ensureCustomerRegistry(core);
  for (const definition of Object.values(definitions)) {
    await ensureCollection(commerce, definition.collection);
    for (const { key, ...options } of definition.indexes)
      await commerce.db.collection(definition.collection).createIndex(key, {
        ...options,
        writeConcern,
      });
  }
  for (const definition of Object.values(coreCommerceStorageDefinitions)) {
    await ensureCollection(core, definition.collection);
    for (const { key, ...options } of definition.indexes)
      await core.db
        .collection(definition.collection)
        .createIndex(key, { ...options, writeConcern });
  }
  await assertCommerceStorageReady(core, coreCommerceStorageDefinitions);
  // Fail closed before serving commerce if a required unique/TTL index differs.
  await assertCommerceStorageReady(commerce, definitions);
}
