import "server-only";
import {
  commerceJson,
  commerceRequestId,
  commerceErrorResponse,
  CommerceServiceError,
} from "@evolve/ecommerce-server/identity";
import { requireCommerceInternalService } from "../internal-service";
import { readCommercePersonalBody } from "../checkout/internal-handler";
import {
  objectWithKeys,
  publicId,
  checkoutError,
} from "../checkout/validation";
import { trackingForSite } from "./reader";
export async function internalTrackingHandler(
  request: Request,
  operation: "overview" | "timeline" | "delivery",
  orderId: string,
  deliveryId?: string,
) {
  const requestId = commerceRequestId();
  try {
    if (request.method !== "POST")
      checkoutError(405, "METHOD_NOT_ALLOWED", "Metodo non consentito.");
    const service = await requireCommerceInternalService(request);
    if (service.shopId !== process.env.ECOMMERCE_SHOP_ID)
      checkoutError(403, "SHOP_MISMATCH", "Servizio non autorizzato.");
    const url = new URL(request.url);
    if (url.search)
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
      operation === "timeline"
        ? ["principal", "cursor", "deliveryPublicId"]
        : ["principal"],
    );
    return commerceJson(
      await trackingForSite(
        { token, body, path: url.pathname },
        operation,
        publicId(orderId),
        requestId,
        deliveryId === undefined ? undefined : publicId(deliveryId),
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
    const response = commerceErrorResponse(error, requestId);
    if (error instanceof CommerceServiceError && error.status === 429)
      response.headers.set("Retry-After", "60");
    return response;
  }
}
