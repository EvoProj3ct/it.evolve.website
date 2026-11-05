import "server-only";
import {
  replaceCommerceRecord,
  type CommerceActor,
} from "@evolve/ecommerce-server/persistence";
import {
  withAtlasCommerceTransaction,
  type AtlasCommerceTransaction,
} from "../persistence/atlas-storage";
import { appendCommerceAudit } from "../persistence/core-adapters";
import {
  objectWithKeys,
  integer,
  publicId,
  checkoutError,
} from "../checkout/validation";
import { text } from "../catalog/validation";
import { instant } from "./validation";
import {
  manualActor,
  orderFor,
  cardFor,
  allEvents,
  mirrorCard,
  replay,
  receipt,
} from "./service";
import { withFulfillmentWrite } from "./guard";
import {
  phaseForCard,
  markFulfillmentChanged,
  aggregateFulfillment,
} from "./state";
import {
  fulfillmentPhaseTransitions,
  fulfillmentPhaseLabels,
  type FulfillmentPhase,
} from "@/config/ecommerce-fulfillment.config";
function openOrder(order: any) {
  if (["completed", "cancelled"].includes(order.operationalStatus))
    checkoutError(
      409,
      "ORDER_CLOSED",
      "L’ordine è chiuso. La riapertura di un completato richiede un amministratore.",
    );
}
function paid(order: any) {
  if (
    order.paymentStatus !== "paid" ||
    order.paymentSummary?.requiresReview ||
    order.operationalStatus === "on_hold"
  )
    checkoutError(
      409,
      "EXECUTION_BLOCKED",
      "Per avanzare servono incasso confermato e ordine non sospeso.",
    );
}
function actual(value: unknown, order: any) {
  const iso = instant(value),
    date = new Date(iso);
  if (date.getTime() > Date.now() + 300000 || date < new Date(order.placedAt))
    checkoutError(
      400,
      "INVALID_ACTUAL_TIME",
      "La data effettiva deve seguire l’ordine e non può essere futura.",
    );
  return date;
}
export async function recordWorkflowTransition(
  tx: AtlasCommerceTransaction,
  order: any,
  event: {
    kind: "card_phase" | "order_phase" | "publication";
    from: string;
    to: string;
    reason: string;
    cardPublicId?: string;
    contentHash?: string;
  },
) {
  await new tx.internal.workflowTransitions({
    shopId: tx.shopId,
    orderId: order._id,
    orderPublicId: order.publicId,
    ...event,
    workspaceRevision: order.fulfillmentRevision || 0,
    actor: tx.actor,
    occurredAt: new Date(),
  }).save({ session: tx.session });
}
export async function changeCardPhase(
  actor: CommerceActor,
  orderId: string,
  cardId: string,
  raw: unknown,
) {
  manualActor(actor);
  const v = objectWithKeys(raw, [
      "expectedRevision",
      "phase",
      "shippedAt",
      "completedAt",
      "reason",
      "idempotencyKey",
    ]),
    revision = integer(v.expectedRevision),
    key = publicId(v.idempotencyKey),
    reason = text(v.reason, 500);
  if (
    typeof v.phase !== "string" ||
    !Object.hasOwn(fulfillmentPhaseLabels, v.phase)
  )
    checkoutError(400, "INVALID_PHASE", "Fase non valida.");
  const phase = v.phase as FulfillmentPhase;
  return withAtlasCommerceTransaction(actor, (tx) =>
    withFulfillmentWrite(tx.session, async () => {
      const order = await orderFor(tx, orderId, true),
        hashes = await replay(tx, order, "phase", key, { cardId, v });
      if (hashes.receipt) return { id: cardId, replayed: true };
      openOrder(order);
      const card = await cardFor(tx, order, cardId),
        from = phaseForCard(card);
      if (card.status === "cancelled")
        checkoutError(409, "FULFILLMENT_CANCELLED", "La scheda è annullata.");
      if (card.revision !== revision)
        checkoutError(
          409,
          "FULFILLMENT_CHANGED",
          "Scheda modificata: ricarica i dati.",
        );
      if (
        !fulfillmentPhaseTransitions[from as FulfillmentPhase]?.includes(phase)
      )
        checkoutError(
          409,
          "INVALID_PHASE_TRANSITION",
          "Passaggio di fase non consentito.",
        );
      if (
        (phase === "shipped" && card.mode !== "shipping") ||
        (phase === "delivered" && card.mode === "service") ||
        (phase === "service_completed" && card.mode !== "service") ||
        (phase === "delivered" &&
          card.mode === "shipping" &&
          from !== "shipped" &&
          from !== "delivered")
      )
        checkoutError(
          409,
          "INVALID_PHASE_TRANSITION",
          "La fase deve rispettare modalità e spedizione precedente.",
        );
      if (phase !== from && phase !== "planned") paid(order);
      const needsShip =
          card.mode === "shipping" && ["shipped", "delivered"].includes(phase),
        needsDone = ["delivered", "service_completed"].includes(phase);
      if (
        (!needsShip && v.shippedAt !== null) ||
        (!needsDone && v.completedAt !== null)
      )
        checkoutError(
          400,
          "INVALID_ACTUAL_TIME",
          "Indica solo le date effettive previste dalla fase.",
        );
      const shippedAt = needsShip ? actual(v.shippedAt, order) : undefined,
        completedAt = needsDone ? actual(v.completedAt, order) : undefined;
      if (shippedAt && completedAt && completedAt < shippedAt)
        checkoutError(
          400,
          "INVALID_ACTUAL_TIME",
          "La consegna deve seguire la spedizione.",
        );
      const changed = await replaceCommerceRecord(
        tx.internal.fulfillmentLinks,
        {
          shopId: tx.shopId,
          id: String(card._id),
          expectedRevision: card.revision,
        },
        { phase, shippedAt, completedAt, actor: tx.actor },
        tx.session,
      );
      await mirrorCard(tx, order, changed);
      const updated = await markFulfillmentChanged(tx, order);
      await recordWorkflowTransition(tx, updated, {
        kind: "card_phase",
        from,
        to: phase,
        reason,
        cardPublicId: card.publicId,
      });
      await receipt(tx, order, "phase", hashes, card.publicId);
      await appendCommerceAudit(tx, {
        action: "fulfillment.phase_changed",
        objectType: "order",
        objectId: order.publicId,
        outcome: "succeeded",
      });
      return { id: card.publicId, replayed: false };
    }),
  );
}
export function parseOrderWorkflow(raw: unknown) {
  const v = objectWithKeys(raw, [
    "action",
    "expectedRevision",
    "reason",
    "idempotencyKey",
  ]);
  if (
    !["start", "hold", "resume", "complete", "reopen"].includes(
      String(v.action),
    )
  )
    checkoutError(400, "INVALID_WORKFLOW_ACTION", "Azione ordine non valida.");
  return {
    action: v.action as "start" | "hold" | "resume" | "complete" | "reopen",
    expectedRevision: integer(v.expectedRevision),
    reason: text(v.reason, 500),
    idempotencyKey: publicId(v.idempotencyKey),
  };
}
/** Caller verifies orders.manage and the dedicated admin capability for reopen. */
export async function changeOrderWorkflow(
  actor: CommerceActor,
  orderId: string,
  input: ReturnType<typeof parseOrderWorkflow>,
) {
  manualActor(actor);
  return withAtlasCommerceTransaction(actor, async (tx) => {
    const order = await orderFor(tx, orderId, true),
      hashes = await replay(tx, order, "order", input.idempotencyKey, input);
    if (hashes.receipt) return { id: order.publicId, replayed: true };
    if (order.revision !== input.expectedRevision)
      checkoutError(
        409,
        "ORDER_CHANGED",
        "Ordine modificato: ricarica i dati.",
      );
    const from = order.operationalStatus;
    let to: string;
    const cards = await tx.internal.fulfillmentLinks
      .find({ shopId: tx.shopId, orderId: order._id })
      .limit(101)
      .session(tx.session)
      .lean();
    if (cards.length > 100)
      checkoutError(409, "FULFILLMENT_LIMIT", "Troppe schede per l’ordine.");
    const aggregate = aggregateFulfillment(order, cards);
    if (input.action === "start" && from === "open") {
      paid(order);
      to = "in_progress";
    } else if (
      input.action === "hold" &&
      ["open", "in_progress"].includes(from)
    )
      to = "on_hold";
    else if (input.action === "resume" && from === "on_hold") {
      if (
        order.paymentSummary?.requiresReview ||
        ["disputed", "under_review"].includes(order.paymentStatus)
      )
        checkoutError(
          409,
          "PAYMENT_REVIEW_REQUIRED",
          "Risolvi l’anomalia prima di riprendere l’ordine.",
        );
      to =
        aggregate.fulfillmentStatus !== "unfulfilled" ||
        order.paymentStatus === "paid"
          ? "in_progress"
          : "open";
    } else if (
      input.action === "complete" &&
      ["open", "in_progress"].includes(from)
    ) {
      if (
        aggregate.fulfillmentStatus !== "fulfilled" ||
        order.paymentSummary?.requiresReview ||
        !["paid", "partially_refunded", "refunded"].includes(
          order.paymentStatus,
        )
      )
        checkoutError(
          409,
          "ORDER_NOT_FULFILLED",
          "Per chiudere servono tutte le quantità evase e pagamento verificato senza anomalie.",
        );
      const events = await allEvents(tx, order),
        activeCards = new Set(
          cards
            .filter((c: any) => c.status !== "cancelled")
            .map((c: any) => c.publicId),
        );
      if (
        events.some(
          (e) =>
            activeCards.has(e.doc.commerceFulfillment.fulfillmentPublicId) &&
            e.doc.data.stato === "programmato",
        )
      )
        checkoutError(
          409,
          "PENDING_ORDER_EVENTS",
          "Completa o annulla manualmente gli eventi ancora programmati prima di chiudere.",
        );
      to = "completed";
    } else if (input.action === "reopen" && from === "completed")
      to = "in_progress";
    else
      checkoutError(
        409,
        "INVALID_ORDER_TRANSITION",
        "Azione non consentita nello stato corrente.",
      );
    const updated = await markFulfillmentChanged(tx, order, {
      operationalStatus: to!,
    });
    await recordWorkflowTransition(tx, updated, {
      kind: "order_phase",
      from,
      to: to!,
      reason: input.reason,
    });
    await receipt(tx, order, "order", hashes, order.publicId);
    await appendCommerceAudit(tx, {
      action: `order.workflow_${input.action}`,
      objectType: "order",
      objectId: order.publicId,
      outcome: "succeeded",
    });
    return { id: order.publicId, replayed: false };
  });
}
