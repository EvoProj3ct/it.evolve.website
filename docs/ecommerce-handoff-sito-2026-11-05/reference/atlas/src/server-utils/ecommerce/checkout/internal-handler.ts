import "server-only";
import {
  commerceJson,
  commerceRequestId,
  commerceErrorResponse,
  CommerceServiceError,
} from "@evolve/ecommerce-server/identity";
import { requireCommerceInternalService } from "../internal-service";
import { checkoutForSite } from "./service";
import { checkoutError, objectWithKeys, publicId } from "./validation";
export async function readCommercePersonalBody(request: Request) {
  if (
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
      request.headers.get("content-type") || "",
    )
  )
    checkoutError(415, "JSON_REQUIRED", "Contenuto JSON richiesto.");
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > 32768))
    checkoutError(413, "BODY_TOO_LARGE", "Richiesta troppo grande.");
  const reader = request.body?.getReader();
  if (!reader) checkoutError(400, "INVALID_INPUT", "Richiesta vuota.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32768) {
        await reader.cancel();
        checkoutError(413, "BODY_TOO_LARGE", "Richiesta troppo grande.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
    );
  } catch {
    return checkoutError(400, "INVALID_INPUT", "JSON non valido.");
  }
}
export async function internalCheckoutHandler(
  request: Request,
  operation: "cart" | "save" | "options" | "quote" | "read-quote",
  id?: string,
) {
  const requestId = commerceRequestId();
  try {
    const service = await requireCommerceInternalService(request);
    if (service.shopId !== process.env.ECOMMERCE_SHOP_ID)
      checkoutError(403, "SHOP_MISMATCH", "Servizio non autorizzato.");
    if (new URL(request.url).search)
      checkoutError(400, "INVALID_QUERY", "Parametri non ammessi.");
    const token = request.headers.get("x-commerce-assertion");
    if (!token || token.length > 4096)
      checkoutError(
        401,
        "CUSTOMER_AUTH_REQUIRED",
        "Identità cliente richiesta.",
      );
    const body = objectWithKeys(
      await readCommercePersonalBody(request),
      operation === "save"
        ? ["principal", "cartPublicId", "expectedRevision", "items"]
        : operation === "quote"
          ? [
              "principal",
              "cartPublicId",
              "cartRevision",
              "policyRevision",
              "termsVersion",
              "idempotencyKey",
              "billing",
              "shipping",
              "fulfillmentSelections",
            ]
          : ["principal"],
    );
    return commerceJson(
      await checkoutForSite(
        { token, body, path: new URL(request.url).pathname },
        operation,
        requestId,
        id ? publicId(id) : undefined,
      ),
      { requestId },
    );
  } catch (error: any) {
    if (error?.code === 11000 && error?.keyPattern?.nonceHash)
      return commerceErrorResponse(
        new CommerceServiceError(
          409,
          "REQUEST_REPLAY",
          "Richiesta già usata. Ripeti con una nuova attestazione.",
        ),
        requestId,
      );
    return commerceErrorResponse(error, requestId);
  }
}
