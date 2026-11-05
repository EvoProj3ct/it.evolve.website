// Shared by core schemas: no connection or Next-only imports.
import type { ClientSession, Schema } from "mongoose";
import { CORE_FULFILLMENT_COLLECTIONS } from "../persistence/core-indexes.mjs";
const held = new WeakSet<ClientSession>();
const reserved = (model: any) =>
  Object.values(CORE_FULFILLMENT_COLLECTIONS).includes(model.collection.name);
export async function withFulfillmentWrite<T>(
  session: ClientSession,
  work: () => Promise<T>,
): Promise<T> {
  if (!session.inTransaction())
    throw new Error("COMMERCE_FULFILLMENT_TRANSACTION_REQUIRED");
  if (held.has(session)) return work();
  held.add(session);
  try {
    return await work();
  } finally {
    held.delete(session);
  }
}
export function installFulfillmentGuard(schema: Schema) {
  function check(model: any, session?: ClientSession) {
    if (reserved(model) && (!session?.inTransaction() || !held.has(session)))
      throw new Error("COMMERCE_FULFILLMENT_WRITER_REQUIRED");
  }
  schema.pre("save", function (this: any) {
    check(this.constructor, this.$session());
  });
  for (const op of [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "replaceOne",
    "findOneAndReplace",
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
  ] as const)
    schema.pre(op, { query: true, document: false }, function (this: any) {
      check(this.model, this.getOptions().session);
    });
  schema.pre(
    "deleteOne",
    { document: true, query: false },
    function (this: any) {
      check(this.constructor, this.$session());
    },
  );
  for (const op of ["insertMany", "bulkWrite"] as const)
    schema.pre(op, function (this: any, next: (error?: Error) => void) {
      next(
        reserved(this)
          ? new Error("COMMERCE_FULFILLMENT_BULK_UNSUPPORTED")
          : undefined,
      );
    });
}
