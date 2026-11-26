import { randomUUID } from "node:crypto";
import { CommerceServiceError } from "./errors.js";

export function commerceRequestId() {
  return randomUUID();
}

export function commerceJson(
  data,
  { status = 200, requestId = commerceRequestId(), headers = {} } = {},
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "X-Request-Id": requestId,
    },
  });
}

export function commerceErrorResponse(error, requestId = commerceRequestId()) {
  const known = error instanceof CommerceServiceError;
  return commerceJson(
    {
      error: {
        code: known ? error.code : "INTERNAL_ERROR",
        message: known ? error.message : "Operazione non disponibile.",
        requestId,
      },
    },
    { status: known ? error.status : 500, requestId },
  );
}

/** Il canale interno non usa cookie o autenticazione di un browser. */
export function assertServerToServerRequest(request) {
  if (
    request.headers.has("origin") ||
    request.headers.has("cookie") ||
    request.headers.has("x-storefront-session")
  ) {
    throw new CommerceServiceError(
      403,
      "SERVICE_CHANNEL_ONLY",
      "Canale riservato ai servizi autorizzati.",
    );
  }
}
