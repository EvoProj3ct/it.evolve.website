import "server-only";
import {
  commerceJson,
  commerceRequestId,
  commerceErrorResponse,
  CommerceServiceError,
} from "@evolve/ecommerce-server/identity";
import { requireCommerceStaffApi } from "../staff-auth";
import { readCommerceStaffMutation } from "../staff-request";
import { publicId, objectId } from "../checkout/validation";
import {
  orderFulfillments,
  listFulfillments,
  saveCard,
  saveEvent,
  moveCalendarEvent,
} from "./service";
import {
  COMMERCE_DELIVERY_TYPE,
  isCommerceEventType,
} from "@/config/ecommerce-fulfillment.config";
import { getEventoById } from "@/server-utils/service/eventiQuery";
import { fulfillmentReadScope } from "./access";
import {
  changeCardPhase,
  changeOrderWorkflow,
  parseOrderWorkflow,
} from "./workflow";
import {
  previewTracking,
  publishTracking,
  withdrawTracking,
  trackingPublicationDetails,
  saveCustomerTrackingText,
} from "./publication";
export async function fulfillmentHandler(
  request: Request,
  operation:
    | "list"
    | "get"
    | "card"
    | "event"
    | "phase"
    | "workflow"
    | "publication"
    | "preview"
    | "publish"
    | "withdraw"
    | "content",
  orderId?: string,
  cardId?: string,
  eventId?: string,
) {
  const requestId = commerceRequestId();
  try {
    const staff = await requireCommerceStaffApi(
        ["publish", "withdraw"].includes(operation)
          ? "ecommerce.fulfillments.publish"
          : operation === "workflow"
            ? "ecommerce.orders.manage"
            : ["list", "get", "publication", "preview"].includes(operation)
              ? "ecommerce.fulfillments.view"
              : "ecommerce.fulfillments.manage",
      ),
      actor = { kind: "staff" as const, id: staff.userId, requestId };
    const params = new URL(request.url).searchParams;
    if (
      [...params.keys()].some(
        (k) =>
          operation !== "list" ||
          k !== "cursor" ||
          params.getAll(k).length !== 1,
      )
    )
      throw new CommerceServiceError(
        400,
        "INVALID_QUERY",
        "Parametri non ammessi.",
      );
    if (operation === "list")
      return commerceJson(
        await listFulfillments(
          params.has("cursor") ? objectId(params.get("cursor")) : undefined,
        ),
        { requestId },
      );
    const order = publicId(orderId);
    if (operation === "get")
      return commerceJson(await orderFulfillments(actor, order), { requestId });
    if (operation === "publication")
      return commerceJson(await trackingPublicationDetails(actor, order), {
        requestId,
      });
    const body = await readCommerceStaffMutation(request);
    if (operation === "content")
      return commerceJson(await saveCustomerTrackingText(actor, order, body), {
        requestId,
      });
    if (operation === "workflow") {
      await requireCommerceStaffApi("ecommerce.fulfillments.manage");
      const input = parseOrderWorkflow(body);
      if (input.action === "reopen")
        await requireCommerceStaffApi("ecommerce.orders.reopen");
      return commerceJson(await changeOrderWorkflow(actor, order, input), {
        requestId,
      });
    }
    if (operation === "phase")
      return commerceJson(
        await changeCardPhase(actor, order, publicId(cardId), body),
        { requestId },
      );
    if (operation === "preview")
      return commerceJson(await previewTracking(actor, order, body), {
        requestId,
      });
    if (operation === "publish")
      return commerceJson(await publishTracking(actor, order, body), {
        requestId,
      });
    if (operation === "withdraw")
      return commerceJson(await withdrawTracking(actor, order, body), {
        requestId,
      });
    const result =
      operation === "card"
        ? await saveCard(
            actor,
            order,
            body,
            cardId ? publicId(cardId) : undefined,
          )
        : await saveEvent(
            actor,
            order,
            publicId(cardId),
            body,
            eventId ? publicId(eventId) : undefined,
          );
    return commerceJson(result, { requestId });
  } catch (error: any) {
    if (error?.code === 11000)
      error = new CommerceServiceError(
        409,
        "FULFILLMENT_CONFLICT",
        "Operazione già registrata o dati cambiati. Ricarica prima di riprovare.",
      );
    return commerceErrorResponse(error, requestId);
  }
}
/** Preserve generic read APIs, prevent orphan writes and route calendar moves to the shared writer. */
export async function legacyFulfillmentGate(
  request: Request,
  type: string,
  operation: "read" | "deny" | "move",
  id?: string,
): Promise<Response | null> {
  if (type !== COMMERCE_DELIVERY_TYPE && !isCommerceEventType(type))
    return null;
  const requestId = commerceRequestId();
  try {
    const staff = await requireCommerceStaffApi(
      operation === "read"
        ? "ecommerce.fulfillments.view"
        : "ecommerce.fulfillments.manage",
    );
    if (operation === "read") {
      fulfillmentReadScope(type);
      return null;
    }
    if (operation === "move" && isCommerceEventType(type) && id) {
      if (new URL(request.url).search)
        throw new CommerceServiceError(
          400,
          "INVALID_QUERY",
          "Parametri non ammessi.",
        );
      await moveCalendarEvent(
        { kind: "staff", id: staff.userId, requestId },
        type,
        objectId(id),
        await readCommerceStaffMutation(request),
      );
      return commerceJson(
        { evento: await getEventoById({ type, id }) },
        { requestId },
      );
    }
    throw new CommerceServiceError(
      409,
      "FULFILLMENT_ORDER_REQUIRED",
      "Gestisci questa scheda e i suoi eventi dall’ordine E-commerce collegato.",
    );
  } catch (error) {
    return commerceErrorResponse(error, requestId);
  }
}
