import {
  createHmac,
  createHash,
  createPrivateKey,
  createPublicKey,
  randomUUID,
} from "node:crypto";
import { SignJWT, jwtVerify, decodeJwt } from "jose";
import { stableJson } from "./storage.js";
import { CommerceServiceError } from "./errors.js";
export const commercePayloadHash = (payload) =>
  createHash("sha256").update(stableJson(payload)).digest("hex");
function sessionKey(config, raw) {
  // RFC 8410 section 10.3: PKCS#8 Ed25519 key containing a 32-byte seed.
  const seed = createHmac("sha256", config.hmacKey)
    .update(`commerce-session-signing-v1\0${config.shopId}\0${raw}`)
    .digest();
  const der = Buffer.concat([
    Buffer.from("302e020100300506032b657004220420", "hex"),
    seed,
  ]);
  try {
    return createPrivateKey({ key: der, format: "der", type: "pkcs8" });
  } finally {
    seed.fill(0);
    der.fill(0);
  }
}
export const sessionProofPublicKey = (config, raw) =>
  createPublicKey(sessionKey(config, raw))
    .export({ format: "der", type: "spki" })
    .toString("base64url");
export async function signCommerceAssertion(
  config,
  raw,
  principal,
  path,
  payload,
  audience,
) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    shop_id: config.shopId,
    session_id: principal.sessionId,
    credential_version: principal.credentialVersion,
    access_version: principal.accessVersion,
    method: "POST",
    path,
    request_hash: commercePayloadHash(payload),
  })
    .setProtectedHeader({ alg: "EdDSA", typ: "commerce-request+jwt" })
    .setIssuer(config.origin)
    .setAudience(audience)
    .setSubject(principal.accountId)
    .setJti(randomUUID())
    .setIssuedAt(now)
    .setExpirationTime(now + 30)
    .sign(sessionKey(config, raw));
}
export function assertionSessionId(token) {
  try {
    if (typeof token !== "string" || token.length > 4096) throw new Error();
    const value = decodeJwt(token);
    if (!/^[a-f0-9]{24}$/.test(value.session_id || "")) throw new Error();
    return value.session_id;
  } catch {
    throw new CommerceServiceError(
      401,
      "CUSTOMER_AUTH_REQUIRED",
      "Sessione del negozio non valida.",
    );
  }
}
export async function verifyCommerceAssertion(token, publicKey, expected) {
  try {
    const key = createPublicKey({
      key: Buffer.from(publicKey, "base64url"),
      format: "der",
      type: "spki",
    });
    if (key.asymmetricKeyType !== "ed25519") throw new Error();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["EdDSA"],
      typ: "commerce-request+jwt",
      issuer: expected.issuer,
      audience: expected.audience,
      maxTokenAge: 35,
      clockTolerance: 5,
      requiredClaims: [
        "iat",
        "exp",
        "jti",
        "sub",
        "session_id",
        "credential_version",
        "access_version",
        "shop_id",
        "method",
        "path",
        "request_hash",
      ],
    });
    if (
      !Number.isInteger(payload.iat) ||
      !Number.isInteger(payload.exp) ||
      payload.exp - payload.iat !== 30 ||
      !/^[A-Za-z0-9_-]{16,80}$/.test(payload.jti || "") ||
      payload.sub !== expected.accountId ||
      payload.session_id !== expected.sessionId ||
      payload.shop_id !== expected.shopId ||
      payload.credential_version !== expected.credentialVersion ||
      payload.access_version !== expected.accessVersion ||
      payload.method !== "POST" ||
      payload.path !== expected.path ||
      payload.request_hash !== commercePayloadHash(expected.body)
    )
      throw new Error();
    return {
      nonceHash: commercePayloadHash([expected.shopId, payload.jti]),
      expiresAt: new Date((payload.exp + 120) * 1000),
    };
  } catch {
    throw new CommerceServiceError(
      401,
      "CUSTOMER_AUTH_REQUIRED",
      "Sessione del negozio non valida.",
    );
  }
}
