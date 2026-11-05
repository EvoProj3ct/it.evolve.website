// Imported by the base Mongoose schema too: no Next-only runtime dependency or connection at import.
import type { Connection, ClientSession, Model, Schema } from "mongoose";
import { withCommerceTransaction } from "@evolve/ecommerce-server/persistence";
import { CommerceServiceError } from "@evolve/ecommerce-server/identity";
import { CUSTOMER_REGISTRY_COLLECTION } from "./core-indexes.mjs";
import { ensureCustomerRegistry } from "./initialize-storage";

const held = new WeakSet<ClientSession>();
const enabled = () =>
  !!(
    process.env.ECOMMERCE_MONGODB_DB ||
    process.env.ECOMMERCE_PROCESSOR_MONGODB_URI
  );
const isCustomer = (model: any) =>
  model.collection.name === "anagrafiche__clienti";
export async function withCustomerRegistryLock<T>(
  connection: Connection,
  session: ClientSession,
  work: () => Promise<T>,
): Promise<T> {
  if (held.has(session)) return work();
  if (!session.inTransaction() || !connection.db)
    throw new Error("COMMERCE_CUSTOMER_TRANSACTION_REQUIRED");
  const changed = await connection.db
    .collection(CUSTOMER_REGISTRY_COLLECTION)
    .updateOne(
      { _id: "customers" as any },
      { $inc: { revision: 1 }, $set: { updatedAt: new Date() } },
      { session },
    );
  if (changed.matchedCount !== 1)
    throw new CommerceServiceError(
      503,
      "CUSTOMER_REGISTRY_NOT_READY",
      "Gestione clienti temporaneamente non disponibile.",
    );
  held.add(session);
  try {
    return await work();
  } finally {
    held.delete(session);
  }
}
/** Same MongoClient/session as the ordinary writer: no privileged connection substitution. */
export async function withCustomerRegistryWrite<T>(
  model: Model<any>,
  work: (session?: ClientSession) => Promise<T>,
): Promise<T> {
  if (!enabled() || !isCustomer(model)) return work();
  await ensureCustomerRegistry(model.db);
  return withCommerceTransaction(model.db, (session) =>
    withCustomerRegistryLock(model.db, session, () => work(session)),
  );
}
function requireLock(model: any, session?: ClientSession) {
  if (
    enabled() &&
    isCustomer(model) &&
    (!session?.inTransaction() || !held.has(session))
  )
    throw new CommerceServiceError(
      503,
      "CUSTOMER_WRITER_REQUIRED",
      "Usa il percorso transazionale di gestione clienti.",
    );
}
const normalize = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
async function noAutomaticDuplicate(
  model: any,
  email: unknown,
  id: unknown,
  session: ClientSession,
) {
  const normalized = normalize(email);
  if (!normalized || normalized.length > 254) return;
  if (id) {
    const previous = await model
      .findById(id)
      .select({ "data.email": 1 })
      .session(session)
      .lean();
    if (normalize(previous?.data?.email) === normalized) return;
  }
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const exists = await model
    .exists({
      ...(id ? { _id: { $ne: id } } : {}),
      "commerceOrigin.shopId": { $type: "string" },
      "data.email": new RegExp(`^\\s*${escaped}\\s*$`, "i"),
    })
    .session(session);
  if (exists)
    throw new CommerceServiceError(
      409,
      "CUSTOMER_ALREADY_CREATED",
      "Esiste già un cliente creato dal negozio con questa email. Verifica e riutilizza l’anagrafica esistente.",
    );
}
/** Also stops uncoordinated legacy/model writes when commerce is configured. */
export function installCustomerRegistryGuard(schema: Schema) {
  schema.pre("save", async function (this: any) {
    const model = this.constructor;
    if (!enabled() || !isCustomer(model)) return;
    if (!this.isNew && !this.isModified("data")) return;
    const session = this.$session();
    requireLock(model, session);
    await noAutomaticDuplicate(
      model,
      this.data?.email,
      this.isNew ? undefined : this._id,
      session,
    );
  });
  for (const operation of [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "replaceOne",
    "findOneAndReplace",
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
  ] as const) {
    schema.pre(
      operation,
      { query: true, document: false },
      async function (this: any) {
        if (!enabled() || !isCustomer(this.model)) return;
        const update = this.getUpdate?.(),
          deleting = /delete/i.test(operation),
          replacing = /replace/i.test(operation);
        const keys =
          update && !Array.isArray(update)
            ? [
                ...Object.keys(update),
                ...Object.values(update).flatMap((value: any) =>
                  value && typeof value === "object" ? Object.keys(value) : [],
                ),
              ]
            : [];
        if (
          !deleting &&
          !replacing &&
          !Array.isArray(update) &&
          !Object.hasOwn(update || {}, "data") &&
          !keys.some((key) => key === "data" || key.startsWith("data.")) &&
          !update?.$rename
        )
          return;
        const session = this.getOptions().session;
        requireLock(this.model, session);
        if (deleting) return;
        if (
          Array.isArray(update) ||
          Object.entries(update || {}).some(
            ([operator, fields]) =>
              operator.startsWith("$") &&
              !["$set", "$unset"].includes(operator) &&
              fields &&
              typeof fields === "object" &&
              Object.keys(fields).some(
                (key) => key === "data" || key.startsWith("data."),
              ),
          ) ||
          operation === "updateMany" ||
          update?.$rename ||
          this.getOptions().upsert
        )
          throw new CommerceServiceError(
            400,
            "CUSTOMER_BULK_UNSUPPORTED",
            "Modifica i clienti singolarmente tramite il servizio dedicato.",
          );
        const incoming =
          update?.["data.email"] ??
          update?.data?.email ??
          update?.$set?.data?.email ??
          update?.$set?.["data.email"];
        if (incoming !== undefined) {
          const original = await this.model
            .findOne(this.getFilter())
            .select({ _id: 1 })
            .session(session)
            .lean();
          await noAutomaticDuplicate(
            this.model,
            incoming,
            original?._id,
            session,
          );
        }
      },
    );
  }
  schema.pre("insertMany", function (this: any, next: (error?: Error) => void) {
    next(
      enabled() && isCustomer(this)
        ? new Error("COMMERCE_CUSTOMER_BULK_UNSUPPORTED")
        : undefined,
    );
  });
  schema.pre("bulkWrite", function (this: any, next: (error?: Error) => void) {
    next(
      enabled() && isCustomer(this)
        ? new Error("COMMERCE_CUSTOMER_BULK_UNSUPPORTED")
        : undefined,
    );
  });
}
