import "server-only";
import { replaceCommerceRecord } from "@evolve/ecommerce-server/persistence";
import type { AtlasCommerceTransaction } from "../persistence/atlas-storage";
import { checkoutError } from "../checkout/validation";
import { fulfillmentPhaseLabels } from "@/config/ecommerce-fulfillment.config";
export const phaseForCard = (card: any) =>
  card.status === "cancelled" ? "cancelled" : card.phase || "planned";
export function trackingInvalidationPatch(order: any) {
  const publication = order.trackingPublication;
  return {
    fulfillmentRevision: (order.fulfillmentRevision || 0) + 1,
    ...(publication
      ? {
          trackingPublication: {
            ...publication,
            ...(publication.state === "published"
              ? { state: "stale", version: publication.version + 1 }
              : {}),
          },
        }
      : {}),
  };
}
export async function clearTrackingProjection(
  tx: AtlasCommerceTransaction,
  order: any,
) {
  await tx.storefront.trackingViews.deleteMany(
    {
      shopId: tx.shopId,
      orderPublicId: order.publicId,
      accountId: order.accountId,
    },
    { session: tx.session },
  );
}
export function aggregateFulfillment(order: any, cards: any[]) {
  const lines = order.lines.filter((l: any) => l.kind !== "delivery"),
    totals = new Map<
      string,
      {
        assigned: number;
        fulfilled: number;
        shipped: number;
        preparing: boolean;
      }
    >();
  for (const line of lines)
    totals.set(line.lineId, {
      assigned: 0,
      fulfilled: 0,
      shipped: 0,
      preparing: false,
    });
  for (const card of cards) {
    const phase = card.phase || "planned",
      needsShip =
        card.mode === "shipping" && ["shipped", "delivered"].includes(phase),
      needsDone = ["delivered", "service_completed"].includes(phase);
    const validDate = (v: any) =>
      v &&
      Number.isFinite(new Date(v).getTime()) &&
      new Date(v) >= new Date(order.placedAt) &&
      new Date(v).getTime() <= Date.now() + 300000;
    if (
      !["shipping", "pickup", "service"].includes(card.mode) ||
      !Object.hasOwn(fulfillmentPhaseLabels, phase) ||
      (phase === "shipped" && card.mode !== "shipping") ||
      (phase === "delivered" && card.mode === "service") ||
      (phase === "service_completed" && card.mode !== "service") ||
      (needsShip ? !validDate(card.shippedAt) : !!card.shippedAt) ||
      (needsDone ? !validDate(card.completedAt) : !!card.completedAt) ||
      (card.shippedAt &&
        card.completedAt &&
        new Date(card.completedAt) < new Date(card.shippedAt)) ||
      (card.status === "cancelled" &&
        ["shipped", "delivered", "service_completed"].includes(phase))
    )
      checkoutError(
        409,
        "FULFILLMENT_INCONSISTENT",
        "Fase e date effettive della scheda non coerenti.",
      );
    if (
      new Set(card.allocations.map((a: any) => a.lineId)).size !==
      card.allocations.length
    )
      checkoutError(
        409,
        "FULFILLMENT_INCONSISTENT",
        "Assegnazioni duplicate nella scheda.",
      );
    if (card.status === "cancelled") continue;
    for (const a of card.allocations) {
      const acc = totals.get(a.lineId),
        line = lines.find((l: any) => l.lineId === a.lineId);
      if (
        !acc ||
        !line ||
        !Number.isSafeInteger(a.quantity) ||
        a.quantity < 1 ||
        (line.kind === "service") !== (card.mode === "service")
      )
        checkoutError(
          409,
          "FULFILLMENT_INCONSISTENT",
          "Assegnazioni dell’ordine da verificare.",
        );
      acc!.assigned += a.quantity;
      if (["delivered", "service_completed"].includes(phase))
        acc!.fulfilled += a.quantity;
      if (card.mode === "shipping" && ["shipped", "delivered"].includes(phase))
        acc!.shipped += a.quantity;
      if (phase === "preparing") acc!.preparing = true;
      if (acc!.assigned > line.quantity)
        checkoutError(
          409,
          "QUANTITY_ALREADY_ASSIGNED",
          "Le quantità assegnate superano quelle ordinate.",
        );
    }
  }
  const fulfillment = lines.map((line: any) => {
    const a = totals.get(line.lineId)!;
    return {
      lineId: line.lineId,
      state:
        a.fulfilled === line.quantity
          ? line.kind === "service"
            ? "service_completed"
            : "delivered"
          : a.shipped > 0
            ? "shipped"
            : a.fulfilled > 0
              ? line.kind === "service"
                ? "service_completed"
                : "delivered"
              : a.preparing
                ? "preparing"
                : "unfulfilled",
      fulfilledQuantity: a.fulfilled,
      shippedQuantity: a.shipped,
    };
  });
  const all =
      lines.length > 0 &&
      lines.every((l: any) => totals.get(l.lineId)!.fulfilled === l.quantity),
    some = fulfillment.some(
      (l) => l.fulfilledQuantity > 0 || l.shippedQuantity > 0,
    ),
    preparing = fulfillment.some((l) => l.state === "preparing");
  return {
    fulfillment,
    fulfillmentStatus: all
      ? "fulfilled"
      : some
        ? "partial"
        : preparing
          ? "in_progress"
          : "unfulfilled",
  };
}
/** Called after every card/event/calendar edit; no provider calls and no automatic EVENTI. */
export async function markFulfillmentChanged(
  tx: AtlasCommerceTransaction,
  order: any,
  patch: Record<string, unknown> = {},
) {
  const cards = await tx.internal.fulfillmentLinks
    .find({ shopId: tx.shopId, orderId: order._id })
    .limit(101)
    .session(tx.session)
    .lean();
  if (cards.length > 100)
    checkoutError(409, "FULFILLMENT_LIMIT", "Troppe schede per l’ordine.");
  const aggregate = aggregateFulfillment(order, cards);
  const updated = await replaceCommerceRecord(
    tx.internal.orders,
    {
      shopId: tx.shopId,
      id: String(order._id),
      expectedRevision: order.revision,
    },
    {
      ...aggregate,
      ...(order.operationalStatus === "cancelled"
        ? { fulfillmentStatus: "cancelled" }
        : {}),
      ...trackingInvalidationPatch(order),
      ...(order.operationalStatus === "open" &&
      aggregate.fulfillmentStatus !== "unfulfilled"
        ? { operationalStatus: "in_progress" }
        : {}),
      ...patch,
    },
    tx.session,
  );
  await clearTrackingProjection(tx, order);
  const view = await tx.storefront.orderViews.updateOne(
    { shopId: tx.shopId, publicId: order.publicId, accountId: order.accountId },
    {
      $set: {
        operationalStatus: updated.operationalStatus,
        fulfillmentStatus: updated.fulfillmentStatus,
      },
      $inc: { revision: 1 },
    },
    { session: tx.session },
  );
  if (view.matchedCount !== 1)
    checkoutError(
      503,
      "ORDER_VIEW_UNAVAILABLE",
      "Riepilogo ordine non disponibile.",
    );
  return updated;
}
