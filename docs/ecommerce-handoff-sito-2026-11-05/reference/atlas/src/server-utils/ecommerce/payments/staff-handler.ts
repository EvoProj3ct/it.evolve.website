import "server-only";
import {
  commerceJson,
  commerceRequestId,
  commerceErrorResponse,
} from "@evolve/ecommerce-server/identity";
import { requireCommerceStaffApi } from "../staff-auth";
import { readCommerceStaffMutation } from "../staff-request";
import { getAtlasCommerceStorage } from "../persistence/atlas-storage";
import { reauthenticateCommerceStaff } from "../accounts/staff-handler";
import {
  integer,
  objectId,
  objectWithKeys,
  plain,
  publicId,
} from "../checkout/validation";
import { decimalMinor } from "../catalog/validation";
import { paymentError, stripeId } from "./config";
import {
  staffFailedEvents,
  staffPaymentDetails,
  staffPayments,
  retryPaymentEvent,
} from "./staff-service";
import { reconcileAttempt } from "./reconcile";
import { cancelUnpaidOrder, processRefund, requestRefund } from "./refunds";
export async function staffPaymentsHandler(
  request: Request,
  operation: "list" | "get" | "action" | "events" | "retry-event",
  id?: string,
) {
  const requestId = commerceRequestId();
  try {
    if (operation === "action" || operation === "retry-event") {
      if (new URL(request.url).search)
        paymentError(400, "INVALID_QUERY", "Parametri non ammessi.");
      const raw = await readCommerceStaffMutation(request),
        base = objectWithKeys(raw, [
          "action",
          "currentPassword",
          "expectedRevision",
          "orderNumber",
          "idempotencyKey",
          "amount",
          "reason",
          "providerSessionId",
          "refundPublicId",
          "providerRefundId",
          "eventId",
        ]),
        action =
          operation === "retry-event" ? "retry-event" : plain(base.action, 40);
      const keys: Record<string, string[]> = {
        reconcile: [],
        "recover-session": ["providerSessionId"],
        "recover-refund": ["refundPublicId", "providerRefundId"],
        refund: [
          "expectedRevision",
          "orderNumber",
          "idempotencyKey",
          "amount",
          "reason",
        ],
        "cancel-order": ["expectedRevision", "orderNumber", "idempotencyKey"],
        "retry-event": ["eventId"],
      };
      if (!Object.hasOwn(keys, action))
        paymentError(400, "INVALID_ACTION", "Operazione non ammessa.");
      objectWithKeys(raw, ["action", "currentPassword", ...keys[action]]);
      const staff = await requireCommerceStaffApi(
          action === "refund"
            ? "ecommerce.payments.refund"
            : action === "cancel-order"
              ? "ecommerce.orders.cancel"
              : "ecommerce.payments.reconcile",
        ),
        storage = await getAtlasCommerceStorage(),
        shopId = process.env.ECOMMERCE_SHOP_ID!;
      await reauthenticateCommerceStaff(
        storage,
        staff,
        base.currentPassword,
        shopId,
        requestId,
      );
      const actor = { kind: "staff" as const, id: staff.userId, requestId };
      if (action === "retry-event") {
        const eventId = stripeId(base.eventId, "evt");
        return commerceJson(await retryPaymentEvent(actor, eventId), {
          requestId,
        });
      }
      const attemptId = publicId(id);
      if (action === "reconcile" || action === "recover-session") {
        await reconcileAttempt(
          attemptId,
          action === "recover-session"
            ? stripeId(base.providerSessionId, "cs")
            : undefined,
        );
      } else if (action === "recover-refund") {
        const refundId = publicId(base.refundPublicId),
          refund = await storage.internal.refunds
            .findOne({ shopId, publicId: refundId })
            .lean(),
          attempt = await storage.internal.paymentAttempts
            .findOne({ shopId, publicId: attemptId })
            .select({ _id: 1 })
            .lean();
        if (
          !refund ||
          !attempt ||
          String(refund.paymentAttemptId) !== String(attempt._id)
        )
          paymentError(404, "REFUND_NOT_FOUND", "Rimborso non disponibile.");
        await processRefund(refundId, stripeId(base.providerRefundId, "re"));
      } else if (action === "refund") {
        const reason = plain(base.reason, 40);
        if (!["requested_by_customer", "duplicate"].includes(reason))
          paymentError(
            400,
            "INVALID_REFUND_REASON",
            "Motivo rimborso non valido.",
          );
        const refund = await requestRefund(actor, attemptId, {
          expectedRevision: integer(base.expectedRevision),
          orderNumber: plain(base.orderNumber, 80),
          amountMinor: decimalMinor(base.amount),
          reason: reason as "requested_by_customer" | "duplicate",
          idempotencyKey: publicId(base.idempotencyKey),
        });
        await processRefund(refund.id);
      } else {
        const accepted = await cancelUnpaidOrder(actor, attemptId, {
          expectedRevision: integer(base.expectedRevision),
          orderNumber: plain(base.orderNumber, 80),
          idempotencyKey: publicId(base.idempotencyKey),
        });
        await reconcileAttempt(accepted.attemptId);
      }
      return commerceJson({ accepted: true }, { requestId });
    }
    await requireCommerceStaffApi("ecommerce.payments.view");
    const params = new URL(request.url).searchParams;
    if (
      [...params.keys()].some(
        (key) =>
          operation !== "list" ||
          !["cursor", "state", "order"].includes(key) ||
          params.getAll(key).length !== 1,
      )
    )
      paymentError(400, "INVALID_QUERY", "Parametri non ammessi.");
    if (operation === "events")
      return commerceJson(await staffFailedEvents(), { requestId });
    if (operation === "get") {
      const staff = await requireCommerceStaffApi("ecommerce.payments.view");
      return commerceJson(
        await staffPaymentDetails(
          { kind: "staff", id: staff.userId, requestId },
          publicId(id),
        ),
        { requestId },
      );
    }
    const state = params.get("state");
    if (
      state &&
      ![
        "creating",
        "ready",
        "processing",
        "paid",
        "failed",
        "expired",
        "cancelled",
        "under_review",
        "attention",
      ].includes(state)
    )
      paymentError(400, "INVALID_QUERY", "Stato non valido.");
    return commerceJson(
      await staffPayments(
        params.has("cursor") ? objectId(params.get("cursor")) : undefined,
        state || undefined,
        params.has("order") ? publicId(params.get("order")) : undefined,
      ),
      { requestId },
    );
  } catch (error) {
    return commerceErrorResponse(error, requestId);
  }
}
