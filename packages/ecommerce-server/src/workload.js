import { createRemoteJWKSet, errors, jwtVerify } from "jose";
import { authenticationError, CommerceServiceError } from "./errors.js";

const resolvers = new Map();

function resolverFor(issuer) {
  let resolver = resolvers.get(issuer);
  if (!resolver) {
    // Issuer validato dalla configurazione: mai usare jku/x5u/URL dal token.
    resolver = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks`), {
      timeoutDuration: 3000,
      cooldownDuration: 30000,
      cacheMaxAge: 300000,
    });
    resolvers.set(issuer, resolver);
  }
  return resolver;
}

export async function verifyVercelServiceIdentity(authorization, policy) {
  if (typeof authorization !== "string" || authorization.length > 16384) {
    throw authenticationError();
  }
  const match =
    /^Bearer ([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)$/.exec(
      authorization,
    );
  if (!match) throw authenticationError();

  try {
    const { payload } = await jwtVerify(match[1], resolverFor(policy.issuer), {
      algorithms: ["RS256"],
      issuer: policy.issuer,
      audience: policy.audience,
      subject: policy.subject,
      typ: "JWT",
      requiredClaims: [
        "iss",
        "aud",
        "sub",
        "iat",
        "nbf",
        "exp",
        "project_id",
        "owner_id",
        "environment",
      ],
      clockTolerance: 5,
    });
    const now = Math.floor(Date.now() / 1000);
    const maxLifetime =
      policy.environment === "development" ? 12 * 3600 : 2 * 3600;
    if (
      payload.aud !== policy.audience ||
      payload.project_id !== policy.projectId ||
      payload.owner_id !== policy.ownerId ||
      payload.environment !== policy.environment ||
      !Number.isSafeInteger(payload.iat) ||
      !Number.isSafeInteger(payload.exp) ||
      payload.iat > now + 5 ||
      payload.exp <= payload.iat ||
      payload.exp - payload.iat > maxLifetime + 10
    ) {
      throw authenticationError();
    }
    // Nessun ruolo, customerId o userId Atlas viene ricavato dalle claim.
    return Object.freeze({
      kind: "service",
      service: "storefront-site",
      shopId: policy.shopId,
      projectId: policy.projectId,
      environment: policy.environment,
    });
  } catch (error) {
    if (
      error instanceof errors.JWKSTimeout ||
      !(
        error instanceof errors.JOSEError ||
        error instanceof CommerceServiceError
      )
    ) {
      throw new CommerceServiceError(
        503,
        "IDENTITY_PROVIDER_UNAVAILABLE",
        "Verifica del servizio temporaneamente non disponibile.",
      );
    }
    throw authenticationError();
  }
}
