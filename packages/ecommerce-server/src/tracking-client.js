import { getVercelOidcToken } from "@vercel/oidc";
import { CommerceServiceError, configurationError } from "./errors.js";
import { requireHttpsOrigin } from "./config.js";
import {
  validatePublicOrderTracking,
  validatePublicTrackingTimeline,
  validatePublicTrackingDelivery,
  trackingId,
  trackingCursor,
} from "./tracking-contract.js";
const inputError = () => {
  throw new CommerceServiceError(
    400,
    "INVALID_TRACKING_INPUT",
    "Richiesta di tracking non valida.",
  );
};
const id = (value) => {
  try {
    return trackingId(value);
  } catch {
    return inputError();
  }
};
const responseError = () =>
  new CommerceServiceError(
    502,
    "TRACKING_RESPONSE_INVALID",
    "Risposta tracking non valida.",
  );
async function readJson(response) {
  const length = response.headers.get("content-length");
  if (
    (length && (!/^\d+$/.test(length) || Number(length) > 1048576)) ||
    !/^application\/json(?:\s*;|$)/i.test(
      response.headers.get("content-type") || "",
    )
  ) {
    await response.body?.cancel();
    throw responseError();
  }
  const reader = response.body?.getReader();
  if (!reader) throw responseError();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1048576) {
        await reader.cancel();
        throw responseError();
      }
      chunks.push(value);
    }
    try {
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
      );
    } catch {
      throw responseError();
    }
  } catch (error) {
    if (error instanceof CommerceServiceError) throw error;
    throw new CommerceServiceError(
      503,
      "ATLAS_UNAVAILABLE",
      "Lettura tracking temporaneamente non disponibile.",
    );
  } finally {
    reader.releaseLock();
  }
}
export function createTrackingClient({
  auth,
  env = process.env,
  timeoutMs = 10000,
}) {
  const origin = requireHttpsOrigin(env.ECOMMERCE_ATLAS_ORIGIN),
    audience = requireHttpsOrigin(env.ECOMMERCE_INTERNAL_AUDIENCE || origin),
    bypass = env.ECOMMERCE_ATLAS_PROTECTION_BYPASS;
  if (
    origin !== audience ||
    !auth ||
    typeof auth.prepareCommerceRequest !== "function" ||
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 1000 ||
    timeoutMs > 15000 ||
    (bypass !== undefined &&
      (typeof bypass !== "string" ||
        bypass.length > 2048 ||
        /[\r\n]/.test(bypass) ||
        bypass !== bypass.trim()))
  )
    throw configurationError();
  async function send(request, path, input, validate, orderId) {
    // GET browser request stays on the site. The signed Atlas hop always uses POST.
    const prepared = await auth.prepareCommerceRequest(request, path, input);
    if (
      !prepared ||
      typeof prepared.assertion !== "string" ||
      prepared.assertion.length > 4096 ||
      !prepared.payload ||
      typeof prepared.payload !== "object"
    )
      throw configurationError();
    let token;
    try {
      token = await getVercelOidcToken({ audience });
    } catch {
      throw new CommerceServiceError(
        503,
        "SERVICE_IDENTITY_UNAVAILABLE",
        "Identità del sito non disponibile.",
      );
    }
    if (typeof token !== "string" || !token)
      throw new CommerceServiceError(
        503,
        "SERVICE_IDENTITY_UNAVAILABLE",
        "Identità del sito non disponibile.",
      );
    let response;
    try {
      response = await fetch(new URL(path, origin), {
        method: "POST",
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Commerce-Assertion": prepared.assertion,
          ...(bypass ? { "x-vercel-protection-bypass": bypass } : {}),
        },
        body: JSON.stringify(prepared.payload),
      });
    } catch {
      throw new CommerceServiceError(
        503,
        "ATLAS_UNAVAILABLE",
        "Collegamento al tracking non disponibile.",
      );
    }
    const data = await readJson(response);
    if (!response.ok) {
      const code = data?.error?.code;
      const known = {
        TRACKING_NOT_FOUND: [404, "Informazioni non disponibili."],
        CUSTOMER_AUTH_REQUIRED: [401, "Sessione del negozio non valida."],
        REQUEST_REPLAY: [409, "Richiesta già usata. Riprova."],
        TRACKING_CHANGED: [
          409,
          "La timeline è cambiata. Ricarica dalla prima pagina.",
        ],
        INVALID_CURSOR: [400, "Pagina timeline non valida."],
        TRACKING_RATE_LIMITED: [
          429,
          "Troppe richieste di tracking. Riprova tra un minuto.",
        ],
      };
      const allowed =
        typeof code === "string" && Object.hasOwn(known, code)
          ? known[code]
          : undefined;
      if (allowed && response.status === allowed[0])
        throw new CommerceServiceError(allowed[0], code, allowed[1]);
      throw new CommerceServiceError(
        response.status >= 500 ? 503 : 502,
        "ATLAS_TRACKING_UNAVAILABLE",
        "Tracking temporaneamente non disponibile.",
      );
    }
    const result = validate(data);
    if (result.orderPublicId !== orderId) throw responseError();
    return result;
  }
  return Object.freeze({
    tracking(request, orderId) {
      const order = id(orderId);
      return send(
        request,
        `/api/ecommerce/internal/orders/${order}/tracking`,
        {},
        validatePublicOrderTracking,
        order,
      );
    },
    async timeline(request, orderId, options = {}) {
      if (
        !options ||
        typeof options !== "object" ||
        Array.isArray(options) ||
        Object.keys(options).some(
          (k) => !["cursor", "deliveryPublicId"].includes(k),
        )
      )
        inputError();
      const order = id(orderId),
        input = {};
      if (options.cursor !== undefined) {
        try {
          input.cursor = trackingCursor(options.cursor);
        } catch {
          inputError();
        }
      }
      if (options.deliveryPublicId !== undefined)
        input.deliveryPublicId = id(options.deliveryPublicId);
      const result = await send(
        request,
        `/api/ecommerce/internal/orders/${order}/timeline`,
        input,
        validatePublicTrackingTimeline,
        order,
      );
      if (
        result.status === "available" &&
        input.deliveryPublicId &&
        result.events.some((e) => e.deliveryPublicId !== input.deliveryPublicId)
      )
        throw responseError();
      return result;
    },
    async delivery(request, orderId, deliveryId) {
      const order = id(orderId),
        delivery = id(deliveryId),
        result = await send(
          request,
          `/api/ecommerce/internal/orders/${order}/deliveries/${delivery}`,
          {},
          validatePublicTrackingDelivery,
          order,
        );
      if (result.delivery.publicId !== delivery) throw responseError();
      return result;
    },
  });
}
