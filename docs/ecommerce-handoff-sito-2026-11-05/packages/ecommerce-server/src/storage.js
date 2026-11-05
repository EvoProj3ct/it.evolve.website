import { createHash, randomUUID } from "node:crypto";
import { readStorefrontDatabaseConfig } from "./config.js";
import { buildStorefrontModels } from "./storefront-models.js";
import { describeCommerceModel, assertInvariant } from "./schema-kit.js";
import { CommerceServiceError } from "./errors.js";

const connections = new WeakMap();
const transactionChecks = new WeakMap();
const storageChecks = new WeakMap();
const sessionClients = new WeakMap();
export function stableJson(value) {
  if (value && typeof value.toJSON === "function")
    return stableJson(value.toJSON());
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export function commerceIndexSignature(definitions) {
  return createHash("sha256")
    .update(
      stableJson(
        Object.values(definitions)
          .map(({ collection, indexes }) => ({
            collection,
            indexes,
          }))
          .sort((a, b) => a.collection.localeCompare(b.collection)),
      ),
    )
    .digest("hex");
}

export async function connectStorefrontDatabase(mongoose, env) {
  const config = readStorefrontDatabaseConfig(env);
  const signature = createHash("sha256")
    .update(`${config.uri}\0${config.dbName}`)
    .digest("hex");
  let cached = connections.get(mongoose);
  if (cached && cached.signature !== signature)
    throw new Error("COMMERCE_CONNECTION_CONFIG_CHANGED");
  if (!cached) {
    cached = { signature, promise: undefined };
    connections.set(mongoose, cached);
  }
  if (!cached.promise) {
    const connection = mongoose.createConnection(config.uri, {
      dbName: config.dbName,
      autoCreate: false,
      autoIndex: false,
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
    cached.promise = connection
      .asPromise()
      .then(async (connected) => {
        await assertCommerceStorageReady(
          connected,
          buildStorefrontModels(connected).definitions,
        );
        return connected;
      })
      .catch(async (error) => {
        cached.promise = undefined;
        await connection.close().catch(() => {});
        throw error;
      });
  }
  return cached.promise;
}

export async function assertTransactionsSupported(connection) {
  if (!transactionChecks.has(connection))
    transactionChecks.set(
      connection,
      (async () => {
        if (!connection.db || connection.readyState !== 1)
          throw new Error("COMMERCE_DATABASE_NOT_CONNECTED");
        const hello = await connection.db.admin().command({ hello: 1 });
        if (!hello.setName && hello.msg !== "isdbgrid")
          throw new Error("COMMERCE_REPLICA_SET_REQUIRED");
        if (!hello.logicalSessionTimeoutMinutes)
          throw new Error("COMMERCE_SESSIONS_REQUIRED");
      })().catch((error) => {
        transactionChecks.delete(connection);
        throw error;
      }),
    );
  await transactionChecks.get(connection);
}

// The site only verifies indexes. Atlas initializes missing collections/indexes;
// adding a model field does not change this check or require a stored schema marker.
export async function assertCommerceStorageReady(connection, definitions) {
  const signature = commerceIndexSignature(definitions);
  let checks = storageChecks.get(connection);
  if (!checks) {
    checks = new Map();
    storageChecks.set(connection, checks);
  }
  if (!checks.has(signature))
    checks.set(
      signature,
      (async () => {
        if (!connection.db) throw new Error("COMMERCE_DATABASE_NOT_CONNECTED");
        for (const definition of Object.values(definitions)) {
          const actual = await connection.db
            .collection(definition.collection)
            .listIndexes()
            .toArray();
          for (const expected of definition.indexes) {
            const found = actual.find((entry) => entry.name === expected.name);
            if (
              !found ||
              JSON.stringify(found.key) !== JSON.stringify(expected.key) ||
              !!found.unique !== !!expected.unique ||
              !!found.sparse ||
              !!found.hidden ||
              found.expireAfterSeconds !== expected.expireAfterSeconds ||
              stableJson(found.partialFilterExpression) !==
                stableJson(expected.partialFilterExpression) ||
              found.collation
            )
              throw new Error(
                `COMMERCE_INDEX_NOT_READY:${definition.collection}:${expected.name}`,
              );
          }
        }
      })().catch((error) => {
        checks.delete(signature);
        throw error;
      }),
    );
  await checks.get(signature);
}

export async function withCommerceTransaction(connection, work) {
  await assertTransactionsSupported(connection);
  const session = await connection.startSession();
  sessionClients.set(session, connection.getClient());
  try {
    return await session.withTransaction(() => work(session), {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority", wtimeoutMS: 5000 },
      readPreference: "primary",
      maxCommitTimeMS: 10000,
    });
  } finally {
    sessionClients.delete(session);
    await session.endSession();
  }
}
export function assertCommerceSession(connection, session) {
  if (
    !session?.inTransaction() ||
    sessionClients.get(session) !== connection.getClient()
  )
    throw new Error("COMMERCE_SHARED_TRANSACTION_REQUIRED");
}

function commandContentHash(record, customer) {
  return createHash("sha256")
    .update(
      stableJson({
        schemaVersion: record.schemaVersion,
        shopId: record.shopId,
        principalId: String(record[customer ? "accountId" : "staffId"]),
        kind: record.kind,
        payload: record.payload?.toObject(),
      }),
    )
    .digest("hex");
}

/** Validate stored shape/hash again on the private processor. Authorization/current account checks remain mandatory. */
export async function loadCommerceCommandForProcessing(
  model,
  { shopId, id },
  session,
  receiptModel,
) {
  assertScope(shopId);
  assertInvariant(
    typeof id === "string" && /^[a-f0-9]{24}$/.test(id),
    "COMMAND_KEY",
  );
  assertCommerceSession(model.db, session);
  const { collection } = describeCommerceModel(model);
  if (
    !["commerce_command_inbox", "commerce_staff_command_inbox"].includes(
      collection,
    )
  )
    throw new Error("COMMERCE_COMMAND_MODEL_REQUIRED");
  const customer = collection === "commerce_command_inbox";
  if (
    customer &&
    (!receiptModel ||
      describeCommerceModel(receiptModel).collection !==
        "commerce_command_receipts" ||
      receiptModel.db.name !== model.db.name)
  )
    throw new Error("COMMERCE_RECEIPT_MODEL_REQUIRED");
  if (customer) assertCommerceSession(receiptModel.db, session);
  const stored = await model
    .findOne({ shopId, _id: id })
    .session(session)
    .lean();
  if (!stored) throw new Error("COMMERCE_COMMAND_NOT_FOUND");
  const command = new model(stored);
  await command.validate();
  if (command.requestHash !== commandContentHash(command, customer))
    throw new Error("COMMERCE_REQUEST_HASH_MISMATCH");
  if (customer) {
    const receipt = await receiptModel
      .exists({
        shopId,
        publicId: command.publicId,
        accountId: command.accountId,
        kind: command.kind,
        requestHash: command.requestHash,
        idempotencyKeyHash: command.idempotencyKeyHash,
      })
      .session(session);
    if (!receipt) throw new Error("COMMERCE_COMMAND_RECEIPT_MISMATCH");
  }
  return command;
}

/** Own transaction. Duplicate-key is handled AFTER rollback, never swallowed within an active transaction. */
export async function appendIdempotentCommerceCommand(
  model,
  document,
  receiptModel,
) {
  const { collection } = describeCommerceModel(model);
  if (
    !["commerce_command_inbox", "commerce_staff_command_inbox"].includes(
      collection,
    )
  )
    throw new Error("COMMERCE_COMMAND_MODEL_REQUIRED");
  const customer = collection === "commerce_command_inbox";
  if (
    customer &&
    (!receiptModel ||
      describeCommerceModel(receiptModel).collection !==
        "commerce_command_receipts" ||
      receiptModel.db.getClient() !== model.db.getClient() ||
      receiptModel.db.name !== model.db.name)
  )
    throw new Error("COMMERCE_RECEIPT_MODEL_REQUIRED");
  const record = new model(document);
  const owner = customer ? "accountId" : "staffId";
  const requestHash = commandContentHash(record, customer);
  if (record.requestHash && record.requestHash !== requestHash)
    throw new Error("COMMERCE_REQUEST_HASH_MISMATCH");
  record.requestHash = requestHash;
  try {
    await withCommerceTransaction(model.db, async (session) => {
      if (customer)
        await insertCommerceRecord(
          receiptModel,
          {
            shopId: record.shopId,
            publicId: record.publicId,
            accountId: record.accountId,
            kind: record.kind,
            idempotencyKeyHash: record.idempotencyKeyHash,
            requestHash: record.requestHash,
          },
          session,
        );
      // Recreate on every retry: a document saved by an aborted attempt has isNew=false.
      await new model(record.toObject()).save({ session });
    });
    return { publicId: record.publicId, replayed: false };
  } catch (error) {
    if (error.code !== 11000) throw error;
    const existing = await (customer ? receiptModel : model)
      .findOne({
        shopId: record.shopId,
        [owner]: record[owner],
        kind: record.kind,
        idempotencyKeyHash: record.idempotencyKeyHash,
      })
      .read("primary");
    if (!existing) throw error;
    if (existing.requestHash !== record.requestHash)
      throw new CommerceServiceError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "Chiave già usata per una richiesta diversa.",
      );
    return { publicId: existing.publicId, replayed: true };
  }
}

export async function insertCommerceRecord(model, document, session) {
  describeCommerceModel(model);
  assertCommerceSession(model.db, session);
  const record = new model(document);
  await record.save({ session });
  return record;
}

export async function replaceCommerceRecord(
  model,
  { shopId, id, expectedRevision },
  patch,
  session,
  extraFilter = {},
) {
  assertScope(shopId);
  assertInvariant(
    typeof id === "string" &&
      /^[a-f0-9]{24}$/.test(id) &&
      Number.isSafeInteger(expectedRevision) &&
      expectedRevision >= 0,
    "RECORD_KEY",
  );
  const definition = describeCommerceModel(model);
  if (definition.appendOnly) throw new Error("COMMERCE_APPEND_ONLY");
  assertCommerceSession(model.db, session);
  const filter = {
    ...extraFilter,
    shopId,
    _id: id,
    revision: expectedRevision,
  };
  const current = await model.findOne(filter).session(session).lean();
  if (!current) throw new Error("COMMERCE_REVISION_CONFLICT");
  // Avoid loading and accidentally erasing excluded credentials in a generic replacement.
  if (
    ["commerce_accounts", "commerce_sessions", "commerce_auth_tokens"].includes(
      definition.collection,
    )
  )
    throw new Error("COMMERCE_IDENTITY_WRITER_REQUIRED");
  for (const key of [
    ...definition.immutableFields,
    "_id",
    "shopId",
    "schemaVersion",
    "revision",
    "createdAt",
    "updatedAt",
  ]) {
    if (Object.hasOwn(patch, key))
      throw new Error(`COMMERCE_IMMUTABLE_FIELD:${key}`);
  }
  const replacement = new model({
    ...current,
    ...patch,
    revision: expectedRevision + 1,
    updatedAt: new Date(),
  });
  await replacement.validate();
  const result = await model.replaceOne(filter, replacement.toObject(), {
    session,
    timestamps: false,
  });
  if (result.modifiedCount !== 1) throw new Error("COMMERCE_REVISION_CONFLICT");
  return replacement;
}

// Only registered job collections have leases; caller still needs DB permissions and a trusted shopId.
function assertJobModel(model) {
  const { collection } = describeCommerceModel(model);
  if (
    ![
      "commerce_operations",
      "commerce_outbox",
      "commerce_payment_events",
      "commerce_identity_jobs",
    ].includes(collection)
  )
    throw new Error("COMMERCE_JOB_MODEL_REQUIRED");
}
function assertScope(shopId) {
  assertInvariant(
    typeof shopId === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(shopId),
    "SHOP_SCOPE",
  );
}
export async function claimCommerceJob(
  model,
  { shopId, workerId, leaseMs = 30000, maxAttempts = 10 },
) {
  assertScope(shopId);
  assertJobModel(model);
  assertInvariant(
    typeof workerId === "string" &&
      workerId.length > 0 &&
      workerId.length <= 100 &&
      Number.isInteger(leaseMs) &&
      leaseMs >= 5000 &&
      leaseMs <= 120000 &&
      Number.isInteger(maxAttempts) &&
      maxAttempts >= 1 &&
      maxAttempts <= 100,
    "LEASE_OPTIONS",
  );
  const now = new Date();
  return model.findOneAndUpdate(
    {
      shopId,
      attempts: { $lt: maxAttempts },
      $or: [
        { state: { $in: ["pending", "failed"] }, availableAt: { $lte: now } },
        { state: "running", "lease.expiresAt": { $lte: now } },
      ],
    },
    {
      $set: {
        state: "running",
        lease: {
          token: randomUUID(),
          owner: workerId,
          expiresAt: new Date(now.getTime() + leaseMs),
        },
      },
      $inc: { revision: 1, attempts: 1 },
      $unset: { lastErrorCode: 1, finishedAt: 1 },
    },
    { sort: { availableAt: 1, _id: 1 }, new: true, runValidators: true },
  );
}
export async function finishCommerceJob(
  model,
  { shopId, id, expectedRevision, leaseToken },
  outcome,
  session,
) {
  assertJobModel(model);
  assertInvariant(
    ["succeeded", "failed", "dead"].includes(outcome.state),
    "JOB_OUTCOME",
  );
  assertInvariant(
    typeof leaseToken === "string" &&
      leaseToken.length > 0 &&
      leaseToken.length <= 100,
    "LEASE_TOKEN",
  );
  assertInvariant(
    outcome.state !== "failed" || outcome.availableAt instanceof Date,
    "JOB_RETRY_TIME",
  );
  const patch = {
    state: outcome.state,
    lease: undefined,
    lastErrorCode: outcome.errorCode,
    ...(outcome.result ? { result: outcome.result } : {}),
    ...(outcome.state === "failed"
      ? { availableAt: outcome.availableAt }
      : { finishedAt: new Date() }),
  };
  return replaceCommerceRecord(
    model,
    { shopId, id, expectedRevision },
    patch,
    session,
    {
      state: "running",
      "lease.token": leaseToken,
      "lease.expiresAt": { $gt: new Date() },
    },
  );
}
export async function reapExhaustedCommerceJobs(
  model,
  { shopId, maxAttempts = 10 },
) {
  assertScope(shopId);
  assertJobModel(model);
  assertInvariant(
    Number.isInteger(maxAttempts) && maxAttempts >= 1 && maxAttempts <= 100,
    "MAX_ATTEMPTS",
  );
  return model.updateMany(
    {
      shopId,
      attempts: { $gte: maxAttempts },
      $or: [
        { state: { $in: ["pending", "failed"] } },
        { state: "running", "lease.expiresAt": { $lte: new Date() } },
      ],
    },
    {
      $set: {
        state: "dead",
        lastErrorCode: "ATTEMPTS_EXHAUSTED",
        finishedAt: new Date(),
      },
      $inc: { revision: 1 },
      $unset: { lease: 1 },
    },
    { runValidators: true },
  );
}
