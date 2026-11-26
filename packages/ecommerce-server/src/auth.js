import { CommerceServiceError } from "./errors.js";
import {
  commerceJson,
  commerceErrorResponse,
  commerceRequestId,
} from "./http.js";
import {
  authConfig,
  authError,
  mailKeys,
  SESSION_COOKIE,
  CSRF_COOKIE,
  AUTH_TTL,
  cookie,
  cookieValue,
  csrf,
  checkMutation,
  boundedBody,
  email,
  exact,
} from "./auth/security.js";
import {
  authRuntime,
  accountContext,
  publicProfile,
  throttle,
} from "./auth/runtime.js";
import {
  authorizeMailDelivery,
  deliverPendingMail,
  mailTransportConfig,
} from "./auth/mail.js";
import * as actions from "./auth/service.js";
import { signCommerceAssertion } from "./assertions.js";
import { requireHttpsOrigin } from "./config.js";

const POST_ACTIONS = new Set([
  "register",
  "verify-email",
  "resend-verification",
  "login",
  "logout",
  "logout-all",
  "forgot-password",
  "reset-password",
  "change-password",
  "change-email",
  "confirm-email",
]);
const MAIL_ACTIONS = new Set([
  "register",
  "resend-verification",
  "forgot-password",
  "change-email",
]);
function readGuard(request, config) {
  if (
    (request.headers.has("origin") &&
      request.headers.get("origin") !== config.origin) ||
    (request.headers.has("sec-fetch-site") &&
      request.headers.get("sec-fetch-site") !== "same-origin")
  )
    authError(403, "ORIGIN_REQUIRED", "Richiesta non consentita.");
}
function withCookies(response, values) {
  for (const value of values) response.headers.append("Set-Cookie", value);
  return response;
}
const cleared = () => [
  cookieValue(SESSION_COOKIE, "", 0),
  cookieValue(CSRF_COOKIE, "", 0, "Strict"),
];
async function jsonBody(request) {
  try {
    const content = await boundedBody(request, 16384);
    return exact(JSON.parse(content), [
      "email",
      "password",
      "name",
      "kind",
      "termsVersion",
      "privacyVersion",
      "token",
      "newPassword",
      "currentPassword",
      "phone",
    ]);
  } catch (error) {
    if (error instanceof CommerceServiceError) throw error;
    authError(400, "INVALID_INPUT", "Contenuto JSON non valido.");
  }
}
function failure(error, requestId) {
  const response = commerceErrorResponse(error, requestId);
  if (
    error instanceof CommerceServiceError &&
    error.code === "AUTH_RATE_LIMITED"
  )
    response.headers.set("Retry-After", String(error.retryAfter));
  return error instanceof CommerceServiceError &&
    error.code === "SESSION_INVALID"
    ? withCookies(response, cleared())
    : response;
}

/** Website backend only. Does not import Atlas/NextAuth or connect at construction time. */
export function createStorefrontAuth({ mongoose, env = process.env }) {
  const runtime = () => {
    const config = authConfig(env);
    return authRuntime(mongoose, env, config);
  };
  return Object.freeze({
    async handleAuth(request, action) {
      const requestId = commerceRequestId();
      try {
        const config = authConfig(env);
        if (action === "csrf" && request.method === "GET") {
          readGuard(request, config);
          const issued = csrf(config, cookie(request, SESSION_COOKIE));
          return withCookies(
            commerceJson({ csrfToken: issued.token }, { requestId }),
            [issued.cookie],
          );
        }
        if (!POST_ACTIONS.has(action))
          authError(404, "NOT_FOUND", "Operazione non disponibile.");
        if (request.method !== "POST")
          return commerceJson(
            {
              error: {
                code: "METHOD_NOT_ALLOWED",
                message: "Metodo non consentito.",
                requestId,
              },
            },
            { status: 405, requestId, headers: { Allow: "POST" } },
          );
        checkMutation(request, config);
        const body = await jsonBody(request);
        if (MAIL_ACTIONS.has(action)) {
          mailTransportConfig(env);
          mailKeys(env);
        }
        const store = await runtime();
        const identity =
          MAIL_ACTIONS.has(action) || action === "login"
            ? email(body.email)
            : typeof body.token === "string"
              ? body.token
              : cookie(request, SESSION_COOKIE) || "anonymous";
        const networkHash = await throttle(
          store,
          request,
          MAIL_ACTIONS.has(action)
            ? "mail"
            : action === "login"
              ? "login"
              : action,
          identity,
        );
        let result = { message: "Operazione completata." },
          status = 200,
          cookies = [];
        switch (action) {
          case "register":
            result = await actions.register(store, body, requestId);
            status = 202;
            break;
          case "resend-verification":
            result = await actions.requestMailToken(
              store,
              body,
              "verify_email",
              requestId,
            );
            status = 202;
            break;
          case "forgot-password":
            result = await actions.requestMailToken(
              store,
              body,
              "reset_password",
              requestId,
            );
            status = 202;
            break;
          case "verify-email":
            result = await actions.verifyEmail(store, body, requestId);
            break;
          case "reset-password":
            result = await actions.resetPassword(store, body, requestId);
            cookies = cleared();
            break;
          case "login": {
            const logged = await actions.login(
                store,
                body,
                requestId,
                networkHash,
              ),
              issued = csrf(config, logged.raw);
            cookies = [
              cookieValue(SESSION_COOKIE, logged.raw, AUTH_TTL.absolute),
              issued.cookie,
            ];
            result = { account: logged.profile, csrfToken: issued.token };
            break;
          }
          case "logout":
            await actions.logout(store, request, body, false, requestId);
            cookies = cleared();
            break;
          case "logout-all":
            await actions.logout(store, request, body, true, requestId);
            cookies = cleared();
            break;
          case "change-password":
            await actions.changePassword(store, request, body, requestId);
            cookies = cleared();
            break;
          case "change-email":
            result = await actions.requestEmailChange(
              store,
              request,
              body,
              requestId,
            );
            status = 202;
            break;
          case "confirm-email":
            await actions.confirmEmailChange(store, request, body, requestId);
            cookies = cleared();
            break;
        }
        return withCookies(
          commerceJson(result, { status, requestId }),
          cookies,
        );
      } catch (error) {
        return failure(error, requestId);
      }
    },
    async handleProfile(request) {
      const requestId = commerceRequestId();
      try {
        const config = authConfig(env);
        if (request.method !== "GET" && request.method !== "PATCH")
          return commerceJson(
            {
              error: {
                code: "METHOD_NOT_ALLOWED",
                message: "Metodo non consentito.",
                requestId,
              },
            },
            { status: 405, requestId, headers: { Allow: "GET, PATCH" } },
          );
        if (request.method === "PATCH") checkMutation(request, config);
        else readGuard(request, config);
        const store = await runtime();
        if (request.method === "PATCH") {
          const body = await jsonBody(request);
          await throttle(
            store,
            request,
            "profile",
            cookie(request, SESSION_COOKIE) || "anonymous",
          );
          return commerceJson(
            {
              account: await actions.updateProfile(
                store,
                request,
                body,
                requestId,
              ),
            },
            { requestId },
          );
        }
        await throttle(
          store,
          request,
          "read",
          cookie(request, SESSION_COOKIE) || "anonymous",
        );
        return commerceJson(
          {
            account: publicProfile(
              await accountContext(store, request, undefined, true),
            ),
          },
          { requestId },
        );
      } catch (error) {
        return failure(error, requestId);
      }
    },
    /** Re-read the server session for each protected request; never take an account ID from the browser. */
    async authenticate(request, { rateLimit } = {}) {
      readGuard(request, authConfig(env));
      const store = await runtime();
      if (rateLimit) {
        if (!["read", "customer-link"].includes(rateLimit))
          authError(400, "INVALID_INPUT", "Operazione non valida.");
        await throttle(
          store,
          request,
          rateLimit,
          cookie(request, SESSION_COOKIE) || "anonymous",
        );
      }
      return (await accountContext(store, request, undefined, true)).principal;
    },
    assertMutation(request) {
      checkMutation(request, authConfig(env));
    },
    /** Server helper for the later website integration. No HTTP route is added by this method. */
    async prepareCommerceRequest(request, path, input = {}) {
      const read =
        /^\/api\/ecommerce\/internal\/orders\/[A-Za-z0-9_-]{16,80}\/(?:tracking|timeline|deliveries\/[A-Za-z0-9_-]{16,80})$/.test(
          path,
        ) ||
        [
          "/api/ecommerce/internal/cart",
          "/api/ecommerce/internal/checkout-options",
          "/api/ecommerce/internal/orders",
        ].includes(path) ||
        /^\/api\/ecommerce\/internal\/(?:quotes|orders)\/[A-Za-z0-9_-]{16,80}$/.test(
          path,
        ) ||
        /^\/api\/ecommerce\/internal\/orders\/[A-Za-z0-9_-]{16,80}\/payment-status$/.test(
          path,
        );
      const method =
        path === "/api/ecommerce/internal/cart/items"
          ? "PUT"
          : /^\/api\/ecommerce\/internal\/orders\/[A-Za-z0-9_-]{16,80}\/payment-session$/.test(
                path,
              )
            ? "POST"
            : [
                  "/api/ecommerce/internal/quotes",
                  "/api/ecommerce/internal/orders/place",
                ].includes(path)
              ? "POST"
              : read
                ? "GET"
                : null;
      if (!method || request.method !== method)
        authError(400, "INVALID_OPERATION", "Operazione non ammessa.");
      const config = authConfig(env);
      if (read) readGuard(request, config);
      else checkMutation(request, config);
      if (
        !input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.hasOwn(input, "principal")
      )
        authError(400, "INVALID_INPUT", "Richiesta non valida.");
      const store = await runtime();
      await throttle(
        store,
        request,
        read ? "read" : "checkout",
        cookie(request, SESSION_COOKIE) || "anonymous",
      );
      const context = await accountContext(store, request, undefined, true),
        p = context.principal;
      const draft = {
        ...input,
        principal: {
          accountId: p.accountId,
          sessionId: p.sessionId,
          credentialVersion: p.credentialVersion,
          accessVersion: p.accessVersion,
        },
      };
      const encoded = JSON.stringify(draft);
      if (Buffer.byteLength(encoded) > 32768)
        authError(413, "BODY_TOO_LARGE", "Richiesta troppo grande.");
      // Sign exactly the JSON representation that the backend will send.
      const payload = JSON.parse(encoded);
      const assertion = await signCommerceAssertion(
        config,
        context.raw,
        p,
        path,
        payload,
        requireHttpsOrigin(env.ECOMMERCE_ATLAS_ORIGIN),
      );
      return Object.freeze({ payload, assertion });
    },
    async handleMailDelivery(request) {
      const requestId = commerceRequestId();
      try {
        authorizeMailDelivery(request, env);
        if (request.method !== "POST")
          authError(405, "METHOD_NOT_ALLOWED", "Metodo non consentito.");
        return commerceJson(await deliverPendingMail(await runtime()), {
          requestId,
        });
      } catch (error) {
        return commerceErrorResponse(error, requestId);
      }
    },
  });
}
