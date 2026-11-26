import { getVercelOidcToken } from "@vercel/oidc";
import { CommerceServiceError } from "./errors.js";
import { boundedBody } from "./auth/security.js";

export function validateCustomerLink(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== 3 ||
    Object.keys(value).some(
      (key) => !["status", "checkoutReady", "message"].includes(key),
    ) ||
    !["pending", "linked", "review_required", "blocked"].includes(
      value.status,
    ) ||
    value.checkoutReady !== (value.status === "linked") ||
    typeof value.message !== "string" ||
    !value.message ||
    value.message.length > 240
  )
    throw new CommerceServiceError(
      502,
      "CUSTOMER_LINK_RESPONSE_INVALID",
      "Risposta del servizio non valida.",
    );
  return {
    status: value.status,
    checkoutReady: value.checkoutReady,
    message: value.message,
  };
}
export function createCustomerLinkClient({
  origin,
  audience,
  timeoutMs,
  protectionBypassSecret,
}) {
  async function send(path, payload, operation) {
    let token;
    try {
      token = await getVercelOidcToken({ audience });
    } catch {
      throw new CommerceServiceError(
        503,
        "SERVICE_IDENTITY_UNAVAILABLE",
        "Identità del servizio non disponibile.",
      );
    }
    if (typeof token !== "string" || !token)
      throw new CommerceServiceError(
        503,
        "SERVICE_IDENTITY_UNAVAILABLE",
        "Identità del servizio non disponibile.",
      );
    let response;
    try {
      response = await fetch(new URL(path, origin), {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(Math.max(timeoutMs, 15000)),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(operation ? { "X-Commerce-Link-Operation": operation } : {}),
          ...(protectionBypassSecret
            ? { "x-vercel-protection-bypass": protectionBypassSecret }
            : {}),
        },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new CommerceServiceError(
        503,
        "ATLAS_UNAVAILABLE",
        "Collegamento ad Atlas temporaneamente non disponibile.",
      );
    }
    if (!response.ok) {
      let code;
      try {
        if (
          response.headers.get("content-type")?.startsWith("application/json")
        )
          code = JSON.parse(await boundedBody(response, 4096))?.error?.code;
        else await response.body?.cancel();
      } catch {
        /* Only an allowlisted error code may influence the public status. */
      }
      const sessionInvalid = !!operation && code === "ACCOUNT_UNAVAILABLE";
      throw new CommerceServiceError(
        sessionInvalid
          ? 401
          : response.status === 401 || response.status === 403
            ? 502
            : response.status === 429
              ? 429
              : 503,
        sessionInvalid ? "SESSION_INVALID" : "CUSTOMER_LINK_UNAVAILABLE",
        sessionInvalid
          ? "Accedi nuovamente al negozio."
          : "Profilo commerciale temporaneamente non disponibile.",
      );
    }
    try {
      if (!response.headers.get("content-type")?.startsWith("application/json"))
        throw new Error();
      return JSON.parse(await boundedBody(response, 4096));
    } catch {
      throw new CommerceServiceError(
        502,
        "CUSTOMER_LINK_RESPONSE_INVALID",
        "Risposta del servizio non valida.",
      );
    }
  }
  return Object.freeze({
    async customerLink(principal, { resolve = false } = {}) {
      if (
        !principal ||
        principal.kind !== "storefront" ||
        !/^[a-f0-9]{24}$/.test(principal.accountId || "") ||
        !Number.isSafeInteger(principal.accessVersion) ||
        principal.accessVersion < 0
      )
        throw new CommerceServiceError(
          401,
          "SESSION_INVALID",
          "Accedi nuovamente al negozio.",
        );
      return validateCustomerLink(
        await send(
          "/api/ecommerce/internal/customer-link",
          {
            accountId: principal.accountId,
            accessVersion: principal.accessVersion,
          },
          resolve ? "resolve" : "read",
        ),
      );
    },
    async reconcileCustomers() {
      const value = await send(
        "/api/ecommerce/internal/customer-identities/reconcile",
        {},
      );
      if (
        !value ||
        typeof value !== "object" ||
        Object.keys(value).length !== 4 ||
        Object.keys(value).some(
          (key) =>
            !["planned", "processed", "deferred", "failed"].includes(key),
        ) ||
        Object.values(value).some(
          (count) => !Number.isInteger(count) || count < 0 || count > 20,
        )
      )
        throw new CommerceServiceError(
          502,
          "CUSTOMER_LINK_RESPONSE_INVALID",
          "Risposta del servizio non valida.",
        );
      return {
        planned: value.planned,
        processed: value.processed,
        deferred: value.deferred,
        failed: value.failed,
      };
    },
  });
}
