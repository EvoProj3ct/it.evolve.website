import "server-only";
import {
  commerceJson,
  commerceRequestId,
  commerceErrorResponse,
  CommerceServiceError,
} from "@evolve/ecommerce-server/identity";
import { requireCommerceInternalService } from "../internal-service";
import { readCommercePersonalBody } from "../checkout/internal-handler";
import { objectWithKeys, publicId } from "../checkout/validation";
import { paymentForSite } from "./service";
import { paymentError } from "./config";
export async function internalPaymentsHandler(
  request: Request,
  operation: "start" | "status",
  id: string,
) {
  const requestId = commerceRequestId();
  try {
    const service = await requireCommerceInternalService(request);
    if (service.shopId !== process.env.ECOMMERCE_SHOP_ID)
      paymentError(403, "SHOP_MISMATCH", "Servizio non autorizzato.");
    if (new URL(request.url).search)
      paymentError(400, "INVALID_QUERY", "Parametri non ammessi.");
    const token = request.headers.get("x-commerce-assertion");
    if (!token || token.length > 4096)
      paymentError(
        401,
        "CUSTOMER_AUTH_REQUIRED",
        "Identità cliente richiesta.",
      );
    const body = objectWithKeys(
      await readCommercePersonalBody(request),
      operation === "start"
        ? ["principal", "expectedRevision", "idempotencyKey"]
        : ["principal"],
    );
    return commerceJson(
      await paymentForSite(
        { token, body, path: new URL(request.url).pathname },
        operation,
        publicId(id),
        requestId,
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
