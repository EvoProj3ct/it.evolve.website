import "server-only";
import {
  initializeCommerceStorage,
  coreCommerceStorageDefinitions,
} from "./initialize-storage";
import {
  buildEventoSchema,
  type IEventoDoc,
} from "@/server-utils/models/evento.schema";
import { createHash } from "node:crypto";
import mongoose, { type ClientSession, type Connection } from "mongoose";
import {
  buildAnagraficaSchema,
  type IAnagraficaDoc,
} from "@/server-utils/models/Anagrafiche/anagrafica.schema";
import {
  buildStorefrontModels,
  withCommerceTransaction,
  commerceIndexSignature,
  type CommerceActor,
  type CommerceModelSet,
} from "@evolve/ecommerce-server/persistence";
import { readStorefrontDatabaseConfig } from "@evolve/ecommerce-server/identity";
import { buildInternalCommerceModels } from "./internal-models.mjs";
import {
  CORE_COMMERCE_COLLECTIONS,
  CORE_FULFILLMENT_COLLECTIONS,
} from "./core-indexes.mjs";

const readiness = new WeakMap<Connection, Map<string, Promise<void>>>();
declare global {
  // eslint-disable-next-line no-var
  var __ATLAS_COMMERCE_PROCESSOR_DB__:
    | { signature: string; promise?: Promise<Connection> }
    | undefined;
}
async function connectProcessor(): Promise<Connection> {
  const coreDb = process.env.MONGODB_DB;
  if (!coreDb || !/^[A-Za-z0-9_-]{1,63}$/.test(coreDb))
    throw new Error("COMMERCE_CORE_DATABASE_NOT_CONFIGURED");
  // Reuse URI/TLS validation, with a dedicated privileged-enough processor credential;
  // never inherit the general Atlas connection (which can read staff/passwords).
  const config = readStorefrontDatabaseConfig({
    ...process.env,
    ECOMMERCE_MONGODB_URI: process.env.ECOMMERCE_PROCESSOR_MONGODB_URI,
    ECOMMERCE_MONGODB_DB: coreDb,
  });
  const signature = createHash("sha256")
    .update(`${config.uri}\0${config.dbName}`)
    .digest("hex");
  let cached = global.__ATLAS_COMMERCE_PROCESSOR_DB__;
  if (cached && cached.signature !== signature)
    throw new Error("COMMERCE_CONNECTION_CONFIG_CHANGED");
  if (!cached) cached = global.__ATLAS_COMMERCE_PROCESSOR_DB__ = { signature };
  if (!cached.promise) {
    const connection = mongoose.createConnection(config.uri, {
      dbName: config.dbName,
      autoIndex: false,
      autoCreate: false,
      bufferCommands: false,
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 60000,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 15000,
      retryWrites: true,
      writeConcern: { w: "majority", wtimeoutMS: 5000 },
    });
    const entry = cached;
    entry.promise = connection.asPromise().catch(async (error) => {
      entry.promise = undefined;
      await connection.close().catch(() => {});
      throw error;
    });
  }
  return cached.promise!;
}
function coreModels(connection: Connection) {
  const records = Object.fromEntries(
    Object.entries({
      ...CORE_COMMERCE_COLLECTIONS,
      deliveries: CORE_FULFILLMENT_COLLECTIONS.deliveries,
    }).map(([key, collection]) => {
      const name = `CommerceCore_v1__${collection}`;
      const schema = buildAnagraficaSchema();
      schema.set("autoIndex", false);
      schema.set("autoCreate", false);
      schema.set("bufferCommands", false);
      return [
        key,
        (connection.models[name] as
          | mongoose.Model<IAnagraficaDoc>
          | undefined) ||
          connection.model<IAnagraficaDoc>(name, schema, collection),
      ];
    }),
  ) as Record<
    "customers" | "revenues" | "deliveries",
    mongoose.Model<IAnagraficaDoc>
  >;
  const eventModel = (collection: string) => {
    const name = `CommerceCore_v1__${collection}`;
    const schema = buildEventoSchema();
    schema.set("autoIndex", false);
    schema.set("autoCreate", false);
    schema.set("bufferCommands", false);
    return (
      (connection.models[name] as mongoose.Model<IEventoDoc>) ||
      connection.model<IEventoDoc>(name, schema, collection)
    );
  };
  return {
    ...records,
    deliveryEvents: eventModel(CORE_FULFILLMENT_COLLECTIONS.deliveryEvents),
    progressEvents: eventModel(CORE_FULFILLMENT_COLLECTIONS.progressEvents),
  };
}
export function readAtlasCommerceDatabaseName(env: NodeJS.ProcessEnv): string {
  const name = env.ECOMMERCE_MONGODB_DB;
  if (!name || name !== name.trim() || !/^[A-Za-z0-9_-]{1,63}$/.test(name))
    throw new Error("COMMERCE_DATABASE_NOT_CONFIGURED");
  if (name === (env.MONGODB_DB?.trim() || "test"))
    throw new Error("COMMERCE_DATABASE_MUST_BE_SEPARATE");
  return name;
}

export async function getAtlasCommerceStorage() {
  const databaseName = readAtlasCommerceDatabaseName(process.env);
  const shopId = process.env.ECOMMERCE_SHOP_ID;
  if (!shopId || !/^[A-Za-z0-9_-]{1,80}$/.test(shopId))
    throw new Error("COMMERCE_SHOP_NOT_CONFIGURED");
  const coreConnection = await connectProcessor();
  // useDb shares the SAME MongoClient. A separate createConnection would break the common transaction.
  const commerceConnection = coreConnection.useDb(databaseName, {
    useCache: true,
  });
  const storefront = buildStorefrontModels(commerceConnection);
  const internal = buildInternalCommerceModels(
    commerceConnection,
  ) as CommerceModelSet;
  const core = coreModels(coreConnection);
  const definitions = { ...storefront.definitions, ...internal.definitions };
  const readinessKey = commerceIndexSignature({
    ...definitions,
    ...coreCommerceStorageDefinitions,
  });
  let checks = readiness.get(commerceConnection);
  if (!checks) {
    checks = new Map();
    readiness.set(commerceConnection, checks);
  }
  const currentChecks = checks;
  if (!currentChecks.has(readinessKey))
    currentChecks.set(
      readinessKey,
      initializeCommerceStorage(
        coreConnection,
        commerceConnection,
        definitions,
      ).catch((error) => {
        currentChecks.delete(readinessKey);
        throw error;
      }),
    );
  await currentChecks.get(readinessKey);
  return {
    coreConnection,
    commerceConnection,
    core,
    storefront: storefront.models,
    internal: internal.models,
  };
}

export type AtlasCommerceStorage = Awaited<
  ReturnType<typeof getAtlasCommerceStorage>
>;
export interface AtlasCommerceTransaction extends AtlasCommerceStorage {
  session: ClientSession;
  shopId: string;
  actor: CommerceActor;
  responsibleOwnerId: mongoose.Types.ObjectId;
  visibilityRoles: string[];
}

/** Internal primitive only: route/service must authenticate and authorize the actor before calling. */
export async function withAtlasCommerceTransaction<T>(
  actor: CommerceActor,
  work: (context: AtlasCommerceTransaction) => Promise<T>,
): Promise<T> {
  const shopId = process.env.ECOMMERCE_SHOP_ID;
  const ownerId = process.env.ECOMMERCE_RECORD_OWNER_ID;
  if (
    !shopId ||
    !/^[A-Za-z0-9_-]{1,80}$/.test(shopId) ||
    !ownerId ||
    !/^[a-f0-9]{24}$/.test(ownerId)
  ) {
    throw new Error("COMMERCE_OWNERSHIP_NOT_CONFIGURED");
  }
  if (
    !["system", "customer", "staff", "provider"].includes(actor.kind) ||
    typeof actor.id !== "string" ||
    !actor.id ||
    actor.id.length > 200 ||
    typeof actor.requestId !== "string" ||
    !actor.requestId ||
    actor.requestId.length > 100 ||
    (["customer", "staff"].includes(actor.kind) &&
      !/^[a-f0-9]{24}$/.test(actor.id))
  )
    throw new Error("COMMERCE_INVALID_ACTOR");
  const storage = await getAtlasCommerceStorage();
  const trustedActor = Object.freeze({
    kind: actor.kind,
    id: actor.id,
    requestId: actor.requestId,
  });
  return withCommerceTransaction(
    storage.coreConnection,
    (session: ClientSession) =>
      work({
        ...storage,
        session,
        shopId,
        actor: trustedActor,
        responsibleOwnerId: new mongoose.Types.ObjectId(ownerId),
        visibilityRoles: ["Amministrazione", "Commerciale"],
      }),
  );
}
