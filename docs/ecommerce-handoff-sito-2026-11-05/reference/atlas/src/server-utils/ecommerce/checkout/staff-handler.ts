import "server-only";
import {
  commerceJson,
  commerceRequestId,
  commerceErrorResponse,
  CommerceServiceError,
} from "@evolve/ecommerce-server/identity";
import { requireCommerceStaffApi } from "../staff-auth";
import { readCommerceStaffMutation } from "../staff-request";
import { checkoutError, publicId, objectId } from "./validation";
import { staffCarts, staffCartDetails } from "./service";
import { readStaffPolicy, saveCheckoutPolicy } from "./policy";
export async function staffCheckoutHandler(
  request: Request,
  operation: "list" | "get" | "policy" | "save-policy",
  id?: string,
) {
  const requestId = commerceRequestId();
  try {
    const staff = await requireCommerceStaffApi(
        operation.includes("policy")
          ? "ecommerce.checkout.configure"
          : "ecommerce.carts.view",
      ),
      actor = { kind: "staff" as const, id: staff.userId, requestId };
    const params = new URL(request.url).searchParams;
    if (
      [...params.keys()].some(
        (key) =>
          operation !== "list" ||
          !["cursor", "status"].includes(key) ||
          params.getAll(key).length !== 1,
      )
    )
      checkoutError(400, "INVALID_QUERY", "Parametri non ammessi.");
    if (operation === "policy")
      return commerceJson(await readStaffPolicy(), { requestId });
    if (operation === "save-policy")
      return commerceJson(
        await saveCheckoutPolicy(
          actor,
          await readCommerceStaffMutation(request),
        ),
        { requestId },
      );
    if (operation === "get")
      return commerceJson(await staffCartDetails(actor, publicId(id)), {
        requestId,
      });
    const state = params.get("status");
    if (state && !["active", "expired", "converted"].includes(state))
      checkoutError(400, "INVALID_QUERY", "Stato non valido.");
    return commerceJson(
      await staffCarts(
        actor,
        params.has("cursor") ? objectId(params.get("cursor")) : undefined,
        state || undefined,
      ),
      { requestId },
    );
  } catch (error: any) {
    if (operation === "save-policy" && error?.code === 11000)
      return commerceErrorResponse(
        new CommerceServiceError(
          409,
          "POLICY_CHANGED",
          "Impostazioni modificate. Ricarica la pagina.",
        ),
        requestId,
      );
    return commerceErrorResponse(error, requestId);
  }
}
