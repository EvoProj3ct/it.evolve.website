import "server-only";
import {
  commerceJson,
  commerceRequestId,
  commerceErrorResponse,
} from "@evolve/ecommerce-server/identity";
import { requireCommerceStaffApi } from "../staff-auth";
import { checkoutError, objectId, publicId } from "../checkout/validation";
import { staffOrders, staffOrderDetails } from "./service";
export async function staffOrdersHandler(request: Request, id?: string) {
  const requestId = commerceRequestId();
  try {
    const staff = await requireCommerceStaffApi("ecommerce.orders.view"),
      params = new URL(request.url).searchParams;
    if (
      [...params.keys()].some(
        (key) =>
          !!id ||
          !["cursor", "status"].includes(key) ||
          params.getAll(key).length !== 1,
      )
    )
      checkoutError(400, "INVALID_QUERY", "Parametri non ammessi.");
    if (id)
      return commerceJson(
        await staffOrderDetails(
          { kind: "staff", id: staff.userId, requestId },
          publicId(id),
        ),
        { requestId },
      );
    const status = params.get("status");
    if (
      status &&
      !["open", "in_progress", "on_hold", "completed", "cancelled"].includes(
        status,
      )
    )
      checkoutError(400, "INVALID_QUERY", "Stato non valido.");
    return commerceJson(
      await staffOrders(
        params.has("cursor") ? objectId(params.get("cursor")) : undefined,
        status || undefined,
      ),
      { requestId },
    );
  } catch (error) {
    return commerceErrorResponse(error, requestId);
  }
}
