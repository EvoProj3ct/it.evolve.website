import { randomUUID } from "node:crypto";
import {
  connectStorefrontDatabase,
  withCommerceTransaction,
} from "../storage.js";
import { buildStorefrontModels } from "../storefront-models.js";
import { CommerceServiceError } from "../errors.js";
import { syncAuthState, touchSessionAccess } from "./projections.js";
import {
  AUTH_TTL,
  authError,
  cookie,
  SESSION_COOKIE,
  hashToken,
  keyedHash,
  networkIdentity,
} from "./security.js";

export async function authRuntime(mongoose, env, config) {
  try {
    const connection = await connectStorefrontDatabase(mongoose, env);
    return {
      connection,
      models: buildStorefrontModels(connection).models,
      env,
      config,
      shopId: config.shopId,
    };
  } catch (error) {
    if (error instanceof CommerceServiceError) throw error;
    authError(
      503,
      "AUTH_STORAGE_UNAVAILABLE",
      "Accesso al negozio temporaneamente non disponibile.",
    );
  }
}
export const tx = (runtime, work) =>
  withCommerceTransaction(runtime.connection, (session) => work(session));
export async function audit(
  runtime,
  event,
  accountId,
  requestId,
  session,
  actorKind = "customer",
  actorId,
  networkHash,
) {
  return new runtime.models.authAudit({
    shopId: runtime.shopId,
    accountId,
    event,
    actorKind,
    actorId,
    requestId,
    outcome: event === "login_failed" ? "rejected" : "succeeded",
    ...(networkHash ? { networkHash } : {}),
    occurredAt: new Date(),
    expiresAt: new Date(Date.now() + 90 * 86400000),
  }).save({ session });
}
async function consume(runtime, label, identity, max, seconds) {
  const now = Date.now(),
    window = Math.floor(now / (seconds * 1000));
  const filter = {
    shopId: runtime.shopId,
    keyHash: keyedHash(runtime.config, `rate:${label}`, identity),
    window,
  };
  let row;
  try {
    row = await runtime.models.authRateLimits.findOneAndUpdate(
      filter,
      {
        $inc: { count: 1, revision: 1 },
        $setOnInsert: { expiresAt: new Date((window + 2) * seconds * 1000) },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );
  } catch (error) {
    if (error?.code !== 11000)
      authError(
        503,
        "AUTH_LIMIT_UNAVAILABLE",
        "Verifica dei tentativi temporaneamente non disponibile.",
      );
    row = await runtime.models.authRateLimits.findOneAndUpdate(
      filter,
      { $inc: { count: 1, revision: 1 } },
      { new: true },
    );
  }
  if (!row)
    authError(
      503,
      "AUTH_LIMIT_UNAVAILABLE",
      "Verifica dei tentativi temporaneamente non disponibile.",
    );
  if (row.count > max) {
    const error = new CommerceServiceError(
      429,
      "AUTH_RATE_LIMITED",
      "Troppi tentativi. Attendi prima di riprovare.",
    );
    error.retryAfter = Math.max(
      1,
      Math.ceil(((window + 1) * seconds * 1000 - now) / 1000),
    );
    throw error;
  }
}
export async function throttle(runtime, request, action, identity = "") {
  const address = networkIdentity(request, runtime.env);
  if (action === "mail") {
    await consume(runtime, "mail-global", "all", 200, 3600);
    await consume(runtime, "mail-network", address, 20, 3600);
    await consume(runtime, "mail-identity", identity, 5, 3600);
  } else if (action === "login") {
    await consume(runtime, "login-global", "all", 1000, 300);
    await consume(runtime, "login-network", address, 60, 900);
    await consume(runtime, "login-identity", identity, 10, 900);
  } else if (action === "read") {
    await consume(runtime, "read-global", "all", 10000, 300);
    await consume(runtime, "read-network", address, 600, 300);
    if (identity) await consume(runtime, "read-session", identity, 120, 300);
  } else {
    await consume(runtime, "actions-global", "all", 2000, 300);
    await consume(runtime, `action:${action}`, address, 30, 900);
    if (identity)
      await consume(runtime, `identity:${action}`, identity, 10, 900);
  }
  return keyedHash(runtime.config, "network-audit", address);
}
export function invalidCredentials() {
  authError(
    401,
    "AUTH_INVALID_CREDENTIALS",
    "Credenziali non valide o account non disponibile.",
  );
}
export function invalidLink() {
  authError(
    400,
    "AUTH_LINK_INVALID",
    "Link non valido, già utilizzato o scaduto.",
  );
}
export async function activeAccess(runtime, accountId, session) {
  const row = await runtime.models.accountAccess
    .findOne({ shopId: runtime.shopId, accountId })
    .session(session || null)
    .lean();
  return row?.status === "active" ? row : null;
}
export async function accountContext(runtime, request, session, touch = false) {
  // Keep the opaque session and its hash-free access projection in one commit,
  // including standalone profile/authentication calls outside an existing TX.
  if (touch && !session)
    return tx(runtime, (activeSession) =>
      accountContext(runtime, request, activeSession, true),
    );
  const raw = cookie(request, SESSION_COOKIE);
  if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw))
    authError(401, "SESSION_INVALID", "Accedi nuovamente al negozio.");
  const now = new Date();
  const stored = await runtime.models.sessions
    .findOne({
      shopId: runtime.shopId,
      tokenHash: hashToken(runtime.config, "session", raw),
      expiresAt: { $gt: now },
      absoluteExpiresAt: { $gt: now },
      revokedAt: { $exists: false },
    })
    .session(session || null)
    .lean();
  if (!stored)
    authError(401, "SESSION_INVALID", "Accedi nuovamente al negozio.");
  const account = await runtime.models.accounts
    .findOne({
      _id: stored.accountId,
      shopId: runtime.shopId,
      status: "active",
      verifiedAt: { $exists: true },
    })
    .session(session || null)
    .lean();
  const access = account
    ? await activeAccess(runtime, account._id, session)
    : null;
  if (
    !account?.publicId ||
    !access ||
    account.credentialVersion !== stored.credentialVersion ||
    access.accessVersion !== stored.accessVersion
  )
    authError(401, "SESSION_INVALID", "Accedi nuovamente al negozio.");
  const profile = await runtime.models.accountProfiles
    .findOne({
      shopId: runtime.shopId,
      accountId: account._id,
      verifiedEmail: account.emailNormalized,
    })
    .session(session || null)
    .lean();
  if (!profile)
    authError(401, "SESSION_INVALID", "Accedi nuovamente al negozio.");
  if (touch) {
    const touchedAt = new Date();
    const result = await runtime.models.sessions.updateOne(
      {
        _id: stored._id,
        shopId: runtime.shopId,
        expiresAt: { $gt: touchedAt },
        absoluteExpiresAt: { $gt: touchedAt },
        revokedAt: { $exists: false },
        credentialVersion: account.credentialVersion,
        accessVersion: access.accessVersion,
      },
      {
        $set: {
          lastSeenAt: touchedAt,
          expiresAt: new Date(
            Math.min(
              touchedAt.getTime() + AUTH_TTL.idle * 1000,
              stored.absoluteExpiresAt.getTime(),
            ),
          ),
        },
        $inc: { revision: 1 },
      },
      { session },
    );
    if (result.matchedCount !== 1)
      authError(401, "SESSION_INVALID", "Accedi nuovamente al negozio.");
    await touchSessionAccess(
      runtime,
      stored,
      new Date(
        Math.min(
          touchedAt.getTime() + AUTH_TTL.idle * 1000,
          stored.absoluteExpiresAt.getTime(),
        ),
      ),
      session,
    );
  }
  return {
    raw,
    stored,
    account,
    access,
    profile,
    principal: Object.freeze({
      kind: "storefront",
      shopId: runtime.shopId,
      accountId: String(account._id),
      sessionId: String(stored._id),
      publicId: account.publicId,
      credentialVersion: account.credentialVersion,
      accessVersion: access.accessVersion,
    }),
  };
}
export function publicProfile(context) {
  return {
    id: context.account.publicId,
    email: context.profile.verifiedEmail,
    name: context.profile.displayName || "",
    kind: context.profile.kind,
    ...(context.profile.phone ? { phone: context.profile.phone } : {}),
    emailVerified: true,
  };
}
export async function revokeSessions(runtime, accountId, session) {
  await syncAuthState(runtime, accountId, session);
  await runtime.models.sessionAccess.updateMany(
    { shopId: runtime.shopId, accountId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() }, $inc: { revision: 1 } },
    { session },
  );
  await runtime.models.sessions.updateMany(
    { shopId: runtime.shopId, accountId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() }, $inc: { revision: 1 } },
    { session },
  );
}
export async function consumeAllTokens(runtime, accountId, session) {
  await runtime.models.authTokens.updateMany(
    { shopId: runtime.shopId, accountId, consumedAt: { $exists: false } },
    { $set: { consumedAt: new Date() }, $inc: { revision: 1 } },
    { session },
  );
}
export async function publishVerifiedProfile(
  runtime,
  account,
  session,
  requestId,
  event = "account_verified",
) {
  let profile = await runtime.models.accountProfiles
    .findOne({ shopId: runtime.shopId, accountId: account._id })
    .session(session)
    .lean();
  if (!profile) {
    const registration = await runtime.models.registrationProfiles
      .findOne({ shopId: runtime.shopId, accountId: account._id })
      .session(session)
      .lean();
    profile = (
      await new runtime.models.accountProfiles({
        shopId: runtime.shopId,
        accountId: account._id,
        verifiedEmail: account.emailNormalized,
        verifiedAt: new Date(),
        displayName: registration?.displayName || "Cliente",
        kind: registration?.kind || "individual",
      }).save({ session })
    ).toObject();
  } else {
    profile = await runtime.models.accountProfiles
      .findOneAndUpdate(
        { _id: profile._id, shopId: runtime.shopId },
        {
          $set: {
            verifiedEmail: account.emailNormalized,
            verifiedAt: new Date(),
          },
          $inc: { revision: 1 },
        },
        { session, new: true },
      )
      .lean();
  }
  await new runtime.models.identityEvents({
    shopId: runtime.shopId,
    publicId: randomUUID(),
    accountId: account._id,
    kind: event,
    profileRevision: profile.revision,
    requestId,
  }).save({ session });
  return profile;
}
