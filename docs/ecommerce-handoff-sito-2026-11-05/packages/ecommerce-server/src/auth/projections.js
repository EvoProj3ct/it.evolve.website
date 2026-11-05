// Hash-free authentication metadata for the Atlas commerce processor. Never an authentication source for a browser.
import { authError } from "./security.js";
import { sessionProofPublicKey } from "../assertions.js";
export async function syncAuthState(runtime, accountId, session) {
  const account = await runtime.models.accounts
    .findOne({ shopId: runtime.shopId, _id: accountId })
    .select({ status: 1, credentialVersion: 1, verifiedAt: 1 })
    .session(session)
    .lean();
  if (!account)
    authError(401, "SESSION_INVALID", "Accedi nuovamente al negozio.");
  await runtime.models.authStates.findOneAndUpdate(
    { shopId: runtime.shopId, accountId },
    {
      $set: {
        status: account.status,
        credentialVersion: account.credentialVersion,
        ...(account.verifiedAt ? { verifiedAt: account.verifiedAt } : {}),
      },
      ...(!account.verifiedAt ? { $unset: { verifiedAt: 1 } } : {}),
      $inc: { revision: 1 },
    },
    { session, upsert: true, new: true, setDefaultsOnInsert: true },
  );
}
export async function publishSessionAccess(runtime, stored, session, raw) {
  await syncAuthState(runtime, stored.accountId, session);
  await new runtime.models.sessionAccess({
    shopId: runtime.shopId,
    sessionId: stored._id,
    accountId: stored.accountId,
    publicKey: sessionProofPublicKey(runtime.config, raw),
    credentialVersion: stored.credentialVersion,
    accessVersion: stored.accessVersion,
    expiresAt: stored.expiresAt,
    absoluteExpiresAt: stored.absoluteExpiresAt,
  }).save({ session });
}
export async function touchSessionAccess(runtime, stored, expiresAt, session) {
  const now = new Date();
  const result = await runtime.models.sessionAccess.updateOne(
    {
      shopId: runtime.shopId,
      sessionId: stored._id,
      accountId: stored.accountId,
      credentialVersion: stored.credentialVersion,
      accessVersion: stored.accessVersion,
      revokedAt: { $exists: false },
      expiresAt: { $gt: now },
      absoluteExpiresAt: { $gt: now },
    },
    { $set: { expiresAt }, $inc: { revision: 1 } },
    { session },
  );
  if (result.matchedCount !== 1)
    authError(401, "SESSION_INVALID", "Accedi nuovamente al negozio.");
}
