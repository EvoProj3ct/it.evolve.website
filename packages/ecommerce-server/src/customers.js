import {
  commerceJson,
  commerceErrorResponse,
  commerceRequestId,
} from "./http.js";
import { atlasCommerceClientFromEnv } from "./client.js";
import { CommerceServiceError, configurationError } from "./errors.js";
import { boundedBody, exact, secretEqual } from "./auth/security.js";

/** WEBSITE backend only. No account/customer identifiers are accepted from a browser. */
export function storefrontCustomerHandlersFromEnv({ auth, env = process.env }) {
  return Object.freeze({
    async handle(request) {
      const requestId = commerceRequestId();
      try {
        if (request.method !== "GET" && request.method !== "POST")
          throw new CommerceServiceError(
            405,
            "METHOD_NOT_ALLOWED",
            "Metodo non consentito.",
          );
        if (new URL(request.url).search)
          throw new CommerceServiceError(
            400,
            "INVALID_QUERY",
            "Parametri non ammessi.",
          );
        const resolve = request.method === "POST";
        if (resolve) {
          auth.assertMutation(request);
          let input;
          try {
            input = JSON.parse(await boundedBody(request, 1024));
          } catch (error) {
            if (error instanceof CommerceServiceError) throw error;
            throw new CommerceServiceError(
              400,
              "INVALID_INPUT",
              "Contenuto non valido.",
            );
          }
          exact(input, []);
        }
        const principal = await auth.authenticate(request, {
          rateLimit: resolve ? "customer-link" : "read",
        });
        if (principal.shopId !== env.ECOMMERCE_SHOP_ID)
          throw configurationError();
        return commerceJson(
          await atlasCommerceClientFromEnv(env).customerLink(principal, {
            resolve,
          }),
          { requestId },
        );
      } catch (error) {
        return commerceErrorResponse(error, requestId);
      }
    },
    async handleReconciliation(request) {
      const requestId = commerceRequestId();
      try {
        const expected = env.ECOMMERCE_CUSTOMER_SYNC_SECRET;
        if (
          typeof expected !== "string" ||
          !/^[A-Za-z0-9_-]{43,128}$/.test(expected) ||
          [
            env.ECOMMERCE_AUTH_DELIVERY_SECRET,
            env.ECOMMERCE_AUTH_HMAC_KEY,
            env.NEXTAUTH_SECRET,
          ].includes(expected)
        )
          throw configurationError();
        if (
          !secretEqual(
            request.headers.get("authorization"),
            `Bearer ${expected}`,
          )
        )
          throw new CommerceServiceError(
            401,
            "SERVICE_REQUIRED",
            "Servizio non autorizzato.",
          );
        if (request.headers.has("origin") || request.headers.has("cookie"))
          throw new CommerceServiceError(
            403,
            "SERVICE_REQUIRED",
            "Canale riservato ai servizi.",
          );
        if (request.method !== "POST")
          throw new CommerceServiceError(
            405,
            "METHOD_NOT_ALLOWED",
            "Metodo non consentito.",
          );
        return commerceJson(
          await atlasCommerceClientFromEnv(env).reconcileCustomers(),
          { requestId },
        );
      } catch (error) {
        return commerceErrorResponse(error, requestId);
      }
    },
  });
}
