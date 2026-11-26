import { configurationError } from "./errors.js";

function required(env, name) {
  const value = env[name];
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) {
    throw configurationError();
  }
  return value;
}

export function requireHttpsOrigin(value) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      value !== url.origin
    ) {
      throw configurationError();
    }
    return url.origin;
  } catch {
    throw configurationError();
  }
}

/** Configurazione del solo chiamante autorizzato; nessuna policy deriva dal JWT. */
export function readVercelTrustPolicy(
  env,
  {
    audienceVariable = "ECOMMERCE_INTERNAL_AUDIENCE",
    callerPrefix = "ECOMMERCE_SITE",
  } = {},
) {
  const issuer = required(env, "ECOMMERCE_OIDC_ISSUER");
  if (!/^https:\/\/oidc\.vercel\.com(?:\/[a-zA-Z0-9_-]+)?$/.test(issuer)) {
    throw configurationError();
  }
  const audience = requireHttpsOrigin(required(env, audienceVariable));
  const subject = required(env, `${callerPrefix}_SUBJECT`);
  const environment = required(env, `${callerPrefix}_ENVIRONMENT`);
  const projectId = required(env, `${callerPrefix}_PROJECT_ID`);
  const ownerId = required(env, `${callerPrefix}_OWNER_ID`);
  const shopId = required(env, "ECOMMERCE_SHOP_ID");
  if (
    !/^[a-zA-Z0-9_-]{1,80}$/.test(shopId) ||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(environment) ||
    !/^prj_[a-zA-Z0-9_-]+$/.test(projectId) ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(ownerId) ||
    !/^owner:[a-zA-Z0-9_-]+:project:[a-zA-Z0-9_-]+:environment:[a-zA-Z0-9_-]+$/.test(
      subject,
    ) ||
    !subject.endsWith(`:environment:${environment}`)
  ) {
    throw configurationError();
  }
  // Un deploy di produzione non accetta il sito preview/development per errore.
  const targetEnvironment = env.VERCEL_TARGET_ENV || env.VERCEL_ENV;
  if (targetEnvironment === "production" && environment !== "production") {
    throw configurationError();
  }
  return Object.freeze({
    issuer,
    audience,
    subject,
    environment,
    projectId,
    ownerId,
    shopId,
  });
}

/** Connessione del negozio: intenzionalmente senza fallback a MONGODB_URI Atlas. */
export function readStorefrontDatabaseConfig(env) {
  const uri = required(env, "ECOMMERCE_MONGODB_URI");
  const dbName = required(env, "ECOMMERCE_MONGODB_DB");
  if (
    !/^mongodb(?:\+srv)?:\/\//i.test(uri) ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(dbName) ||
    (typeof env.MONGODB_URI === "string" && uri === env.MONGODB_URI.trim())
  ) {
    throw configurationError();
  }
  const authority = uri.slice(uri.indexOf("://") + 3).split(/[/?]/, 1)[0];
  const hosts = authority.slice(authority.lastIndexOf("@") + 1).split(",");
  const local = hosts.some((host) =>
    /^(?:127(?:\.\d{1,3}){3}|localhost|\[::1\])(?::\d+)?$/i.test(host),
  );
  const tlsExplicit = /[?&](?:tls|ssl)=true(?:&|$)/i.test(uri);
  if (
    env.VERCEL_ENV &&
    (local ||
      /[?&](?:tls|ssl)=false(?:&|$)/i.test(uri) ||
      (!/^mongodb\+srv:\/\//i.test(uri) && !tlsExplicit))
  ) {
    throw configurationError();
  }
  return Object.freeze({ uri, dbName });
}
