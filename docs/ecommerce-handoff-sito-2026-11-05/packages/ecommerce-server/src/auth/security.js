import {
  randomBytes,
  createHash,
  createHmac,
  timingSafeEqual,
  scrypt,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { isIP } from "node:net";
import { CommerceServiceError, configurationError } from "../errors.js";
import { requireHttpsOrigin } from "../config.js";

export const SESSION_COOKIE = "__Host-storefront_session";
export const CSRF_COOKIE = "__Host-storefront_csrf";
export const AUTH_TTL = Object.freeze({
  idle: 1800,
  absolute: 43200,
  csrf: 1800,
  verify_email: 86400,
  reset_password: 900,
  change_email: 900,
});
export const authError = (status, code, message) => {
  throw new CommerceServiceError(status, code, message);
};
export const opaque = () => randomBytes(32).toString("base64url");
export const hashToken = (config, purpose, token) =>
  createHash("sha256")
    .update(`storefront\0${config.shopId}\0${purpose}\0${token}`)
    .digest("hex");
export const secretEqual = (left, right) =>
  typeof left === "string" &&
  typeof right === "string" &&
  Buffer.byteLength(left) === Buffer.byteLength(right) &&
  timingSafeEqual(Buffer.from(left), Buffer.from(right));
export const keyedHash = (config, purpose, value) =>
  createHmac("sha256", config.hmacKey)
    .update(`${config.shopId}\0${purpose}\0${value}`)
    .digest("hex");
function key(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value))
    throw configurationError();
  const decoded = Buffer.from(value, "base64url");
  if (decoded.length !== 32 || decoded.toString("base64url") !== value)
    throw configurationError();
  return decoded;
}
export function authConfig(env) {
  const origin = requireHttpsOrigin(env.ECOMMERCE_STOREFRONT_ORIGIN);
  if (
    !/^[A-Za-z0-9_-]{1,80}$/.test(env.ECOMMERCE_SHOP_ID || "") ||
    env.ECOMMERCE_AUTH_HMAC_KEY === env.NEXTAUTH_SECRET ||
    env.ECOMMERCE_AUTH_HMAC_KEY === env.ECOMMERCE_AUTH_DELIVERY_SECRET ||
    env.ECOMMERCE_AUTH_HMAC_KEY === env.ECOMMERCE_CUSTOMER_SYNC_SECRET
  )
    throw configurationError();
  return Object.freeze({
    origin,
    shopId: env.ECOMMERCE_SHOP_ID,
    hmacKey: key(env.ECOMMERCE_AUTH_HMAC_KEY),
  });
}
export function mailKeys(env) {
  let raw;
  try {
    raw = JSON.parse(env.ECOMMERCE_AUTH_EMAIL_KEYS || "");
  } catch {
    throw configurationError();
  }
  const active = env.ECOMMERCE_AUTH_EMAIL_KEY_ID;
  if (
    !raw ||
    Array.isArray(raw) ||
    typeof raw !== "object" ||
    Object.keys(raw).length > 5 ||
    !/^[A-Za-z0-9_-]{1,40}$/.test(active || "")
  )
    throw configurationError();
  const keys = new Map();
  for (const [id, value] of Object.entries(raw)) {
    if (
      !/^[A-Za-z0-9_-]{1,40}$/.test(id) ||
      value === env.ECOMMERCE_AUTH_HMAC_KEY ||
      value === env.NEXTAUTH_SECRET ||
      value === env.ECOMMERCE_AUTH_DELIVERY_SECRET ||
      value === env.ECOMMERCE_CUSTOMER_SYNC_SECRET
    )
      throw configurationError();
    keys.set(id, key(value));
  }
  if (!keys.has(active)) throw configurationError();
  return { active, keys };
}
export function sealMail(env, config, id, payload) {
  const ring = mailKeys(env),
    iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", ring.keys.get(ring.active), iv);
  cipher.setAAD(Buffer.from(`${config.shopId}\0${id}\0${ring.active}`));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return {
    keyId: ring.active,
    iv: iv.toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
  };
}
export function openMail(env, config, id, envelope) {
  const encryptionKey = mailKeys(env).keys.get(envelope.keyId);
  if (!encryptionKey) throw configurationError();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey,
    Buffer.from(envelope.iv, "base64url"),
  );
  decipher.setAAD(Buffer.from(`${config.shopId}\0${id}\0${envelope.keyId}`));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8"),
  );
}
export function exact(value, keys) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((name) => !keys.includes(name))
  )
    authError(400, "INVALID_INPUT", "Campi della richiesta non validi.");
  return value;
}
export function text(value, max, min = 1) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.length > max ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    authError(
      400,
      "INVALID_INPUT",
      "Completa correttamente i campi richiesti.",
    );
  return value.trim();
}
export function email(value) {
  const result = text(value, 254).toLowerCase(),
    parts = result.split("@");
  if (
    parts.length !== 2 ||
    parts[0].length > 64 ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
      result,
    ) ||
    parts[0].startsWith(".") ||
    parts[0].endsWith(".") ||
    parts[0].includes("..")
  )
    authError(400, "INVALID_EMAIL", "Indirizzo email non valido.");
  return result; // Case-insensitive; never remove dots, plus aliases or apply provider rules.
}
export function password(value, newPassword = false) {
  if (
    typeof value !== "string" ||
    !value ||
    Buffer.byteLength(value, "utf8") > 512 ||
    /[\u0000\uD800-\uDFFF]/u.test(value)
  )
    authError(400, "INVALID_PASSWORD", "Password non valida.");
  const normalized = value.normalize("NFC"),
    length = [...normalized].length;
  if (
    length > 128 ||
    Buffer.byteLength(normalized, "utf8") > 512 ||
    (newPassword && length < 15)
  )
    authError(
      400,
      "INVALID_PASSWORD",
      "Usa una passphrase da 15 a 128 caratteri.",
    );
  return normalized;
}
let hashesRunning = 0;
async function derive(value, salt) {
  if (hashesRunning >= 2)
    authError(
      503,
      "AUTH_BUSY",
      "Accesso temporaneamente occupato. Riprova tra poco.",
    );
  hashesRunning++;
  try {
    return await new Promise((resolve, reject) =>
      scrypt(
        value,
        salt,
        64,
        { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
        (error, result) => (error ? reject(error) : resolve(result)),
      ),
    );
  } finally {
    hashesRunning--;
  }
}
export async function hashPassword(value) {
  const salt = randomBytes(32),
    digest = await derive(value, salt);
  return `scrypt$v1$131072$8$1$${salt.toString("base64url")}$${digest.toString("base64url")}`;
}
export async function verifyPassword(value, stored) {
  const valid =
    typeof stored === "string" &&
    /^scrypt\$v1\$131072\$8\$1\$[A-Za-z0-9_-]{43}\$[A-Za-z0-9_-]{86}$/.test(
      stored,
    );
  const parts = valid ? stored.split("$") : [],
    salt = valid ? Buffer.from(parts[5], "base64url") : Buffer.alloc(32);
  const actual = await derive(value, salt),
    expected = valid ? Buffer.from(parts[6], "base64url") : Buffer.alloc(64);
  return timingSafeEqual(actual, expected) && valid;
}
export async function checkBreachedPassword(value) {
  const digest = createHash("sha1")
    .update(value, "utf8")
    .digest("hex")
    .toUpperCase();
  let response;
  try {
    response = await fetch(
      `https://api.pwnedpasswords.com/range/${digest.slice(0, 5)}`,
      {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(4000),
        headers: {
          "Add-Padding": "true",
          "User-Agent": "Evolve-Storefront-Password-Check",
          Accept: "text/plain",
        },
      },
    );
  } catch {
    authError(
      503,
      "PASSWORD_CHECK_UNAVAILABLE",
      "Verifica della password temporaneamente non disponibile.",
    );
  }
  if (!response.ok) {
    await response.body?.cancel();
    authError(
      503,
      "PASSWORD_CHECK_UNAVAILABLE",
      "Verifica della password temporaneamente non disponibile.",
    );
  }
  let content;
  try {
    content = await boundedBody(response, 262144);
  } catch {
    authError(
      503,
      "PASSWORD_CHECK_UNAVAILABLE",
      "Verifica della password temporaneamente non disponibile.",
    );
  }
  const lines = content.trim().split(/\r?\n/);
  if (
    lines.length < 1 ||
    lines.some((line) => !/^[A-F0-9]{35}:\d{1,15}$/.test(line))
  )
    authError(
      503,
      "PASSWORD_CHECK_UNAVAILABLE",
      "Verifica della password temporaneamente non disponibile.",
    );
  if (
    lines.some(
      (line) =>
        line.slice(0, 35) === digest.slice(5) && BigInt(line.slice(36)) > 0,
    )
  )
    authError(
      400,
      "PASSWORD_EXPOSED",
      "Questa password risulta compromessa. Scegli una passphrase diversa.",
    );
}
export async function boundedBody(message, max) {
  const length = message.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > max)) {
    await message.body?.cancel();
    authError(413, "BODY_TOO_LARGE", "Richiesta troppo grande.");
  }
  const reader = message.body?.getReader();
  if (!reader) authError(400, "INVALID_INPUT", "Contenuto non valido.");
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        authError(413, "BODY_TOO_LARGE", "Richiesta troppo grande.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Buffer.concat(chunks),
  );
}
export function cookie(request, name) {
  const matches = (request.headers.get("cookie") || "")
    .split(";")
    .map((item) => item.trim())
    .filter((item) => item.startsWith(`${name}=`));
  if (matches.length > 1)
    authError(401, "SESSION_INVALID", "Accedi nuovamente al negozio.");
  return matches.length ? matches[0].slice(name.length + 1) : null;
}
export const cookieValue = (name, value, maxAge, sameSite = "Lax") =>
  `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}`;
export function csrf(config, sessionToken) {
  const nonce = opaque(),
    expires = Math.floor(Date.now() / 1000) + AUTH_TTL.csrf;
  const signature = keyedHash(
    config,
    "csrf",
    `${nonce}\0${expires}\0${sessionToken || "anonymous"}\0${config.origin}`,
  );
  return {
    token: `${nonce}.${expires}.${signature}`,
    cookie: cookieValue(CSRF_COOKIE, nonce, AUTH_TTL.csrf, "Strict"),
  };
}
export function checkMutation(request, config) {
  if (
    request.headers.get("origin") !== config.origin ||
    (request.headers.has("sec-fetch-site") &&
      request.headers.get("sec-fetch-site") !== "same-origin")
  )
    authError(403, "ORIGIN_REQUIRED", "Richiesta non consentita.");
  if (
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
      request.headers.get("content-type") || "",
    )
  )
    authError(415, "JSON_REQUIRED", "È richiesto un contenuto JSON.");
  const token = request.headers.get("x-storefront-csrf") || "",
    match = /^([A-Za-z0-9_-]{43})\.(\d{10})\.([a-f0-9]{64})$/.exec(token);
  if (!match || !secretEqual(cookie(request, CSRF_COOKIE), match[1]))
    authError(403, "CSRF_INVALID", "Ricarica la pagina prima di riprovare.");
  const expires = Number(match[2]),
    now = Math.floor(Date.now() / 1000);
  if (
    expires <= now ||
    expires > now + AUTH_TTL.csrf ||
    !secretEqual(
      match[3],
      keyedHash(
        config,
        "csrf",
        `${match[1]}\0${expires}\0${cookie(request, SESSION_COOKIE) || "anonymous"}\0${config.origin}`,
      ),
    )
  )
    authError(403, "CSRF_INVALID", "Ricarica la pagina prima di riprovare.");
}
export function networkIdentity(request, env) {
  let address;
  if (env.VERCEL === "1")
    address = request.headers.get("x-vercel-forwarded-for");
  else if (env.NODE_ENV === "development" && !env.VERCEL_ENV)
    address = "127.0.0.1";
  if (!address || !isIP(address.trim()))
    authError(
      503,
      "CLIENT_ADDRESS_UNAVAILABLE",
      "Verifica della richiesta temporaneamente non disponibile.",
    );
  address = address.trim().toLowerCase();
  // A rotating IPv6 host address within a /64 must not bypass the network limit.
  if (isIP(address) === 6) {
    const normalized = new URL(`http://[${address}]/`).hostname.slice(1, -1);
    const [left, right = ""] = normalized.split("::"),
      start = left ? left.split(":") : [],
      end = right ? right.split(":") : [];
    address =
      [
        ...start,
        ...Array(Math.max(0, 8 - start.length - end.length)).fill("0"),
        ...end,
      ]
        .slice(0, 4)
        .map((part) => part.padStart(4, "0"))
        .join(":") + "::/64";
  }
  return address;
}
