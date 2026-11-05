import "server-only";
import {
  COMMERCE_DELIVERY_TYPE,
  isCommerceEventType,
} from "@/config/ecommerce-fulfillment.config";
import { requireCommerceStaffApi } from "../staff-auth";
import { CommerceServiceError } from "@evolve/ecommerce-server/identity";
export function fulfillmentReadScope(type: string): Record<string, string> {
  if (type !== COMMERCE_DELIVERY_TYPE && !isCommerceEventType(type)) return {};
  const shopId = process.env.ECOMMERCE_SHOP_ID;
  if (!shopId || !/^[A-Za-z0-9_-]{1,80}$/.test(shopId))
    throw new CommerceServiceError(
      503,
      "COMMERCE_SHOP_NOT_CONFIGURED",
      "Negozio non configurato.",
    );
  return {
    [type === COMMERCE_DELIVERY_TYPE
      ? "commerceOrigin.shopId"
      : "commerceFulfillment.shopId"]: shopId,
  };
}
export async function requireFulfillmentReader(type: string) {
  if (type === COMMERCE_DELIVERY_TYPE || isCommerceEventType(type))
    await requireCommerceStaffApi("ecommerce.fulfillments.view");
  return fulfillmentReadScope(type);
}
