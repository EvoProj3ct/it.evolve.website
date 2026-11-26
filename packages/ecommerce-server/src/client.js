import { getVercelOidcToken } from "@vercel/oidc";
import { configurationError, CommerceServiceError } from "./errors.js";
import { requireHttpsOrigin } from "./config.js";
import { createCatalogClient } from "./catalog-client.js";
import { createCustomerLinkClient } from "./customer-client.js";

/** Client nominativo: non offre un proxy libero verso le route Atlas. */
export function createAtlasCommerceClient({
  origin,
  audience = origin,
  timeoutMs = 5000,
  protectionBypassSecret,
}) {
  const safeOrigin = requireHttpsOrigin(origin);
  const safeAudience = requireHttpsOrigin(audience);
  if (
    safeOrigin !== safeAudience ||
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 1000 ||
    timeoutMs > 15000
  ) {
    throw configurationError();
  }
  if (
    protectionBypassSecret !== undefined &&
    (typeof protectionBypassSecret !== "string" ||
      !protectionBypassSecret ||
      protectionBypassSecret.length > 2048 ||
      protectionBypassSecret !== protectionBypassSecret.trim() ||
      /[\r\n]/.test(protectionBypassSecret))
  )
    throw configurationError();

  return Object.freeze({
    ...createCustomerLinkClient({
      origin: safeOrigin,
      audience: safeAudience,
      timeoutMs,
      protectionBypassSecret,
    }),
    ...createCatalogClient({
      origin: safeOrigin,
      audience: safeAudience,
      timeoutMs,
      protectionBypassSecret,
    }),
    async probe() {
      let token;
      try {
        token = await getVercelOidcToken({ audience: safeAudience });
      } catch {
        throw new CommerceServiceError(
          503,
          "SERVICE_IDENTITY_UNAVAILABLE",
          "Identità del sito non disponibile.",
        );
      }
      if (typeof token !== "string" || !token) {
        throw new CommerceServiceError(
          503,
          "SERVICE_IDENTITY_UNAVAILABLE",
          "Identità del sito non disponibile.",
        );
      }
      let response;
      try {
        response = await fetch(
          new URL("/api/ecommerce/internal/health", safeOrigin),
          {
            method: "GET",
            cache: "no-store",
            redirect: "error",
            signal: AbortSignal.timeout(timeoutMs),
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              ...(protectionBypassSecret
                ? { "x-vercel-protection-bypass": protectionBypassSecret }
                : {}),
            },
          },
        );
      } catch {
        throw new CommerceServiceError(
          503,
          "ATLAS_UNAVAILABLE",
          "Collegamento ad Atlas non disponibile.",
        );
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new CommerceServiceError(
          response.status === 401 || response.status === 403 ? 502 : 503,
          "ATLAS_SERVICE_REJECTED",
          "Collegamento ad Atlas non autorizzato o non disponibile.",
        );
      }
      const length = response.headers.get("content-length");
      if (length && (!/^\d+$/.test(length) || Number(length) > 4096)) {
        await response.body?.cancel();
        throw new CommerceServiceError(
          502,
          "ATLAS_RESPONSE_INVALID",
          "Risposta Atlas non valida.",
        );
      }
      if (
        !response.headers.get("content-type")?.startsWith("application/json")
      ) {
        await response.body?.cancel();
        throw new CommerceServiceError(
          502,
          "ATLAS_RESPONSE_INVALID",
          "Risposta Atlas non valida.",
        );
      }
      const reader = response.body?.getReader();
      if (!reader)
        throw new CommerceServiceError(
          502,
          "ATLAS_RESPONSE_INVALID",
          "Risposta Atlas non valida.",
        );
      let size = 0;
      const chunks = [];
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 4096) {
            await reader.cancel();
            throw new CommerceServiceError(
              502,
              "ATLAS_RESPONSE_INVALID",
              "Risposta Atlas non valida.",
            );
          }
          chunks.push(value);
        }
      } catch (error) {
        if (error instanceof CommerceServiceError) throw error;
        throw new CommerceServiceError(
          503,
          "ATLAS_UNAVAILABLE",
          "Lettura della risposta Atlas non disponibile.",
        );
      } finally {
        reader.releaseLock();
      }
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (
          body.service !== "atlas-ecommerce-internal" ||
          body.status !== "ok" ||
          body.version !== 1
        )
          throw new Error();
        return Object.freeze({
          service: "atlas-ecommerce-internal",
          status: "ok",
          version: 1,
        });
      } catch {
        throw new CommerceServiceError(
          502,
          "ATLAS_RESPONSE_INVALID",
          "Risposta Atlas non valida.",
        );
      }
    },
  });
}

export function atlasCommerceClientFromEnv(env) {
  return createAtlasCommerceClient({
    origin: env.ECOMMERCE_ATLAS_ORIGIN,
    audience: env.ECOMMERCE_INTERNAL_AUDIENCE,
    protectionBypassSecret: env.ECOMMERCE_ATLAS_PROTECTION_BYPASS || undefined,
  });
}
