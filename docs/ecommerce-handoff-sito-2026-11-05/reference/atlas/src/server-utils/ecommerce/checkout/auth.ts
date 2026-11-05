import "server-only";
import {
  verifyCommerceAssertion,
  assertionSessionId,
} from "@evolve/ecommerce-server/assertions";
import { type AtlasCommerceTransaction } from "../persistence/atlas-storage";
import { parsePrincipal, checkoutError } from "./validation";
export interface CheckoutPrincipal {
  accountId: string;
  sessionId: string;
  credentialVersion: number;
  accessVersion: number;
}
function issuer() {
  try {
    const raw = process.env.ECOMMERCE_ASSERTION_ISSUER!,
      value = new URL(raw);
    if (
      value.protocol !== "https:" ||
      value.origin !== raw ||
      value.username ||
      value.password
    )
      throw new Error();
    return raw;
  } catch {
    return checkoutError(
      503,
      "ASSERTION_NOT_CONFIGURED",
      "Verifica dell’identità cliente non configurata.",
    );
  }
}
/** Revalidate revocation/expiry and fence the hash-free metadata in the same business transaction. */
export async function lockCheckoutPrincipal(
  tx: AtlasCommerceTransaction,
  proof: { token: string; body: Record<string, unknown>; path: string },
  recheckCommittedClaim = false,
) {
  const p = parsePrincipal(proof.body.principal),
    now = new Date();
  if (assertionSessionId(proof.token) !== p.sessionId)
    checkoutError(
      401,
      "CUSTOMER_AUTH_REQUIRED",
      "Sessione del negozio non valida.",
    );
  const state = await tx.storefront.authStates
    .findOneAndUpdate(
      {
        shopId: tx.shopId,
        accountId: p.accountId,
        status: "active",
        credentialVersion: p.credentialVersion,
        verifiedAt: { $exists: true },
      },
      { $inc: { guard: 1 } },
      { session: tx.session, new: true },
    )
    .lean();
  const session = state
    ? await tx.storefront.sessionAccess
        .findOneAndUpdate(
          {
            shopId: tx.shopId,
            sessionId: p.sessionId,
            accountId: p.accountId,
            credentialVersion: p.credentialVersion,
            accessVersion: p.accessVersion,
            expiresAt: { $gt: now },
            absoluteExpiresAt: { $gt: now },
            revokedAt: { $exists: false },
          },
          { $inc: { guard: 1 } },
          { session: tx.session, new: true },
        )
        .lean()
    : null;
  const access = session
    ? await tx.storefront.accountAccess
        .findOneAndUpdate(
          {
            shopId: tx.shopId,
            accountId: p.accountId,
            status: "active",
            accessVersion: p.accessVersion,
          },
          { $inc: { guard: 1 } },
          { session: tx.session, new: true },
        )
        .lean()
    : null;
  const profile = access
    ? await tx.storefront.accountProfiles
        .findOne({ shopId: tx.shopId, accountId: p.accountId })
        .session(tx.session)
        .lean()
    : null;
  if (!profile || !session)
    checkoutError(
      401,
      "CUSTOMER_AUTH_REQUIRED",
      "Sessione del negozio non valida.",
    );
  const claim = await verifyCommerceAssertion(proof.token, session!.publicKey, {
    ...p,
    issuer: issuer(),
    audience: process.env.ECOMMERCE_INTERNAL_AUDIENCE!,
    shopId: tx.shopId,
    path: proof.path,
    body: proof.body,
  });
  if (recheckCommittedClaim) {
    // Only the second phase of the SAME HTTP request, after a provider call.
    // Public handlers always claim first; this is not a replay acceptance path.
    const previous = await tx.internal.requestClaims
      .exists({
        shopId: tx.shopId,
        accountId: p.accountId,
        sessionId: p.sessionId,
        nonceHash: claim.nonceHash,
      })
      .session(tx.session);
    if (!previous)
      checkoutError(
        401,
        "CUSTOMER_AUTH_REQUIRED",
        "Sessione del negozio non valida.",
      );
  } else
    await new tx.internal.requestClaims({
      shopId: tx.shopId,
      accountId: p.accountId,
      sessionId: p.sessionId,
      ...claim,
    }).save({ session: tx.session });
  return { principal: p, profile };
}
