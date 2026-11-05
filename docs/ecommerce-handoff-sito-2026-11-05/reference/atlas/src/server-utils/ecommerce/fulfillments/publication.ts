import "server-only";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import {
  stableJson,
  replaceCommerceRecord,
  type CommerceActor,
} from "@evolve/ecommerce-server/persistence";
import {
  withAtlasCommerceTransaction,
  type AtlasCommerceTransaction,
} from "../persistence/atlas-storage";
import { appendCommerceAudit } from "../persistence/core-adapters";
import {
  checkoutError,
  objectWithKeys,
  integer,
  publicId,
} from "../checkout/validation";
import { text, sourceHash } from "../catalog/validation";
import { expectation } from "./validation";
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
  aggregateFulfillment,
  phaseForCard,
  clearTrackingProjection,
  markFulfillmentChanged,
} from "./state";
import { recordWorkflowTransition } from "./workflow";
import type {
  TrackingSnapshot,
  TrackingSelection,
  TrackingPreview,
  TrackingPublicationDetails,
  FulfillmentTime,
} from "./types";
const contentHash = (snapshot: TrackingSnapshot) =>
  createHash("sha256").update(stableJson(snapshot)).digest("hex");
function selectionInput(raw: unknown): TrackingSelection {
  if (!Array.isArray(raw) || raw.length > 100)
    checkoutError(400, "INVALID_SELECTION", "Selezione schede non valida.");
  const result = raw
    .map((value) => {
      const v = objectWithKeys(value, ["cardId", "eventIds"]);
      if (!Array.isArray(v.eventIds) || v.eventIds.length > 500)
        checkoutError(400, "INVALID_SELECTION", "Selezione eventi non valida.");
      const eventIds = v.eventIds.map(publicId).sort();
      if (new Set(eventIds).size !== eventIds.length)
        checkoutError(400, "INVALID_SELECTION", "Eventi duplicati.");
      return { cardId: publicId(v.cardId), eventIds };
    })
    .sort((a, b) => a.cardId.localeCompare(b.cardId));
  if (
    new Set(result.map((s) => s.cardId)).size !== result.length ||
    result.reduce((n, s) => n + s.eventIds.length, 0) > 500
  )
    checkoutError(
      400,
      "INVALID_SELECTION",
      "Selezione duplicata o troppo ampia.",
    );
  return result;
}
function previewInput(raw: unknown, publish = false) {
  const v = objectWithKeys(raw, [
    "workspaceRevision",
    "publicationVersion",
    "selection",
    ...(publish ? ["previewHash", "idempotencyKey"] : []),
  ]);
  return {
    workspaceRevision: integer(v.workspaceRevision),
    publicationVersion: integer(v.publicationVersion),
    selection: selectionInput(v.selection),
    ...(publish
      ? {
          previewHash: sourceHash(v.previewHash),
          idempotencyKey: publicId(v.idempotencyKey),
        }
      : {}),
  };
}
function current(
  order: any,
  input: { workspaceRevision: number; publicationVersion: number },
) {
  if (
    (order.fulfillmentRevision || 0) !== input.workspaceRevision ||
    (order.trackingPublication?.version || 0) !== input.publicationVersion
  )
    checkoutError(
      409,
      "TRACKING_PREVIEW_CHANGED",
      "Lavorazione o pubblicazione cambiate. Ricarica e prepara una nuova anteprima.",
    );
}
async function candidate(
  tx: AtlasCommerceTransaction,
  order: any,
  selection: TrackingSelection,
): Promise<TrackingSnapshot> {
  const cards = await tx.internal.fulfillmentLinks
    .find({ shopId: tx.shopId, orderId: order._id })
    .limit(101)
    .session(tx.session)
    .lean();
  if (cards.length > 100)
    checkoutError(409, "FULFILLMENT_LIMIT", "Troppe schede per l’ordine.");
  if (order.operationalStatus === "cancelled" && selection.length)
    checkoutError(
      409,
      "CANCELLED_TRACKING_SELECTION",
      "Per un ordine annullato pubblica solo lo stato dell’ordine, senza schede pianificate.",
    );
  const aggregate = aggregateFulfillment(order, cards);
  if (
    order.operationalStatus !== "cancelled" &&
    aggregate.fulfillmentStatus !== order.fulfillmentStatus
  )
    checkoutError(
      409,
      "FULFILLMENT_INCONSISTENT",
      "Il riepilogo evasione non coincide con le schede: verifica la lavorazione prima di pubblicare.",
    );
  const events = await allEvents(tx, order),
    deliveries: TrackingSnapshot["deliveries"] = [],
    publicEvents: TrackingSnapshot["events"] = [];
  for (const selected of selection) {
    const card = cards.find((c: any) => c.publicId === selected.cardId);
    if (!card)
      checkoutError(
        400,
        "INVALID_SELECTION",
        "Scheda non appartenente all’ordine.",
      );
    if (
      !(await tx.core.deliveries
        .exists({
          _id: card!.deliveryAnagraficaId,
          "commerceOrigin.shopId": tx.shopId,
        })
        .session(tx.session))
    )
      checkoutError(
        409,
        "FULFILLMENT_INCONSISTENT",
        "Anagrafica consegna non disponibile.",
      );
    if (!["shipping", "pickup", "service"].includes(card!.mode))
      checkoutError(409, "FULFILLMENT_INCONSISTENT", "Modalità da verificare.");
    const owned = events.filter(
        (e) => e.doc.commerceFulfillment.fulfillmentPublicId === card!.publicId,
      ),
      chosen = [];
    for (const id of selected.eventIds) {
      const found = owned.filter(
        (e) => e.doc.commerceFulfillment.publicId === id,
      );
      if (found.length !== 1)
        checkoutError(
          400,
          "INVALID_SELECTION",
          "Evento non appartenente alla scheda o riferimento ambiguo.",
        );
      chosen.push(found[0]);
    }
    const primary = chosen.find(
      (e) =>
        e.type === "consegna_ecommerce" &&
        String(e.doc._id) === String(card!.primaryPlannedEventId || "") &&
        e.doc.data.stato !== "annullato",
    );
    if (
      !card!.customerTitle?.trim() ||
      chosen.some((e) => !e.doc.commerceFulfillment.customerTitle?.trim())
    )
      checkoutError(
        400,
        "CUSTOMER_TITLE_REQUIRED",
        "Completa i titoli cliente delle schede e degli eventi selezionati. I titoli interni non vengono pubblicati automaticamente.",
      );
    const message = text(card!.customerMessage || "", 3000, true);
    deliveries.push({
      publicId: card!.publicId,
      label: text(card!.customerTitle || "", 200),
      mode: card!.mode,
      phase: phaseForCard(card),
      ...(message ? { message } : {}),
      ...(primary
        ? { expected: expectation(primary.doc.commerceFulfillment.expectation) }
        : {}),
      ...(card!.shippedAt
        ? { shippedAt: new Date(card!.shippedAt).toISOString() }
        : {}),
      ...(card!.completedAt
        ? { completedAt: new Date(card!.completedAt).toISOString() }
        : {}),
      lines: card!.allocations.map((a: any) => {
        const line = order.lines.find(
          (l: any) => l.lineId === a.lineId && l.kind !== "delivery",
        );
        if (!line)
          checkoutError(
            409,
            "FULFILLMENT_INCONSISTENT",
            "Riga ordine non disponibile.",
          );
        return { lineId: a.lineId, title: line.title, quantity: a.quantity };
      }),
    });
    for (const { type, doc } of chosen) {
      const m = doc.commerceFulfillment,
        status = (
          {
            programmato: "planned",
            completato: "completed",
            annullato: "cancelled",
          } as const
        )[doc.data.stato as "programmato" | "completato" | "annullato"];
      if (!status)
        checkoutError(
          409,
          "FULFILLMENT_INCONSISTENT",
          "Stato evento da verificare.",
        );
      const message = text(m.customerMessage || "", 3000, true);
      publicEvents.push({
        publicId: m.publicId,
        deliveryPublicId: card!.publicId,
        kind: type === "consegna_ecommerce" ? "delivery" : "progress",
        title: text(m.customerTitle || "", 200),
        ...(message ? { text: message } : {}),
        status,
        scheduled: expectation(m.expectation),
        ...(m.actualAt
          ? { occurredAt: new Date(m.actualAt).toISOString() }
          : {}),
      });
    }
  }
  const timeKey = (e: TrackingSnapshot["events"][number]) =>
    e.occurredAt ||
    (e.scheduled.kind === "date" ? e.scheduled.date : e.scheduled.startsAt);
  publicEvents.sort(
    (a, b) =>
      timeKey(a).localeCompare(timeKey(b)) ||
      a.publicId.localeCompare(b.publicId),
  );
  const snapshot: TrackingSnapshot = {
    orderPublicId: order.publicId,
    phase: order.operationalStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    deliveries,
    events: publicEvents,
  };
  if (Buffer.byteLength(stableJson(snapshot), "utf8") > 524288)
    checkoutError(
      413,
      "TRACKING_VIEW_TOO_LARGE",
      "I contenuti selezionati sono troppo grandi. Riduci i testi o il numero di eventi pubblicati.",
    );
  return snapshot;
}
function storedTime(value: any): FulfillmentTime {
  return expectation(
    value.kind === "date"
      ? { kind: value.kind, date: value.date, timeZone: value.timeZone }
      : {
          kind: value.kind,
          startsAt: new Date(value.startsAt).toISOString(),
          ...(value.endsAt
            ? { endsAt: new Date(value.endsAt).toISOString() }
            : {}),
          timeZone: value.timeZone,
        },
  );
}
/** Positive projection only. Shared with the future authenticated customer reader. */
export function trackingSnapshotFromRecord(record: any): TrackingSnapshot {
  return {
    orderPublicId: publicId(record.orderPublicId),
    phase: record.phase,
    fulfillmentStatus: record.fulfillmentStatus,
    deliveries: record.deliveries.map((d: any) => ({
      publicId: publicId(d.publicId),
      label: text(d.label, 200),
      mode: d.mode,
      phase: d.phase,
      ...(d.message ? { message: text(d.message, 3000) } : {}),
      ...(d.expected ? { expected: storedTime(d.expected) } : {}),
      ...(d.shippedAt
        ? { shippedAt: new Date(d.shippedAt).toISOString() }
        : {}),
      ...(d.completedAt
        ? { completedAt: new Date(d.completedAt).toISOString() }
        : {}),
      lines: d.lines.map((l: any) => ({
        lineId: publicId(l.lineId),
        title: text(l.title, 200),
        quantity: integer(l.quantity, 1000, 1),
      })),
    })),
    events: record.events.map((e: any) => ({
      publicId: publicId(e.publicId),
      deliveryPublicId: publicId(e.deliveryPublicId),
      kind: e.kind,
      title: text(e.title, 200),
      ...(e.text ? { text: text(e.text, 3000) } : {}),
      status: e.status,
      scheduled: storedTime(e.scheduled),
      ...(e.occurredAt
        ? { occurredAt: new Date(e.occurredAt).toISOString() }
        : {}),
    })),
  };
}
/** Requires an already authorized order, read in the same transaction. Missing/obsolete approval returns no content. */
export async function publishedTracking(
  tx: AtlasCommerceTransaction,
  order: any,
): Promise<TrackingPublicationDetails> {
  const p = order.trackingPublication;
  const approvedAt = p?.publishedAt ? new Date(p.publishedAt) : null;
  const result: TrackingPublicationDetails = {
    workspaceRevision: order.fulfillmentRevision || 0,
    publicationVersion: p?.version || 0,
    state: p?.state || "unpublished",
    publishedAt:
      approvedAt && Number.isFinite(approvedAt.getTime())
        ? approvedAt.toISOString()
        : null,
    snapshot: null,
  };
  if (p?.state !== "published") return result;
  if (
    !Number.isSafeInteger(p.version) ||
    p.version < 1 ||
    !Number.isSafeInteger(p.sourceRevision) ||
    p.sourceRevision < 0 ||
    !Number.isSafeInteger(result.workspaceRevision) ||
    !result.publishedAt ||
    typeof p.contentHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(p.contentHash)
  )
    return { ...result, state: "stale" };
  const row = await tx.storefront.trackingViews
    .findOne({
      shopId: tx.shopId,
      accountId: order.accountId,
      orderPublicId: order.publicId,
    })
    .session(tx.session)
    .lean();
  if (
    !row ||
    row.sourceRevision !== result.workspaceRevision ||
    p.sourceRevision !== result.workspaceRevision ||
    row.publicationVersion !== p.version ||
    row.contentHash !== p.contentHash ||
    row.phase !== order.operationalStatus ||
    row.fulfillmentStatus !== order.fulfillmentStatus
  )
    return { ...result, state: "stale" };
  try {
    const snapshot = trackingSnapshotFromRecord(row);
    if (contentHash(snapshot) !== p.contentHash)
      return { ...result, state: "stale" };
    return { ...result, snapshot };
  } catch {
    return { ...result, state: "stale" };
  }
}
export async function trackingPublicationDetails(
  actor: CommerceActor,
  orderId: string,
) {
  manualActor(actor);
  return withAtlasCommerceTransaction(actor, async (tx) =>
    publishedTracking(tx, await orderFor(tx, orderId)),
  );
}
export async function previewTracking(
  actor: CommerceActor,
  orderId: string,
  raw: unknown,
): Promise<TrackingPreview> {
  manualActor(actor);
  const input = previewInput(raw);
  return withAtlasCommerceTransaction(actor, async (tx) => {
    const order = await orderFor(tx, orderId);
    current(order, input);
    const snapshot = await candidate(tx, order, input.selection);
    return {
      workspaceRevision: input.workspaceRevision,
      publicationVersion: input.publicationVersion,
      hash: contentHash(snapshot),
      snapshot,
    };
  });
}
export async function publishTracking(
  actor: CommerceActor,
  orderId: string,
  raw: unknown,
) {
  manualActor(actor);
  const input = previewInput(raw, true);
  return withAtlasCommerceTransaction(actor, async (tx) => {
    const order = await orderFor(tx, orderId, true),
      hashes = await replay(tx, order, "publish", input.idempotencyKey!, input);
    if (hashes.receipt) return { id: order.publicId, replayed: true };
    current(order, input);
    const snapshot = await candidate(tx, order, input.selection),
      hash = contentHash(snapshot);
    if (hash !== input.previewHash)
      checkoutError(
        409,
        "TRACKING_PREVIEW_CHANGED",
        "L’anteprima non coincide più con i dati. Preparala nuovamente.",
      );
    const version = input.publicationVersion + 1,
      now = new Date(),
      { orderPublicId: _id, ...body } = snapshot;
    const values = {
      ...body,
      sourceRevision: input.workspaceRevision,
      publicationVersion: version,
      publishedAt: now,
      contentHash: hash,
    };
    const previous = await tx.storefront.trackingViews
      .findOne({
        shopId: tx.shopId,
        accountId: order.accountId,
        orderPublicId: order.publicId,
      })
      .session(tx.session)
      .lean();
    if (previous)
      await replaceCommerceRecord(
        tx.storefront.trackingViews,
        {
          shopId: tx.shopId,
          id: String(previous._id),
          expectedRevision: previous.revision,
        },
        values,
        tx.session,
      );
    else
      await new tx.storefront.trackingViews({
        shopId: tx.shopId,
        publicId: order.publicId,
        accountId: order.accountId,
        orderPublicId: order.publicId,
        ...values,
      }).save({ session: tx.session });
    const updated = await replaceCommerceRecord(
      tx.internal.orders,
      {
        shopId: tx.shopId,
        id: String(order._id),
        expectedRevision: order.revision,
      },
      {
        trackingPublication: {
          version,
          state: "published",
          sourceRevision: input.workspaceRevision,
          contentHash: hash,
          publishedAt: now,
          publishedBy: actor.id,
          selection: input.selection,
        },
      },
      tx.session,
    );
    // Cast/serialize round-trip must produce exactly the approved customer payload.
    const verified = await publishedTracking(tx, updated);
    if (!verified.snapshot || contentHash(verified.snapshot) !== hash)
      checkoutError(
        409,
        "TRACKING_PROJECTION_MISMATCH",
        "La vista cliente non coincide con l’anteprima: pubblicazione annullata.",
      );
    await recordWorkflowTransition(tx, updated, {
      kind: "publication",
      from: order.trackingPublication?.state || "unpublished",
      to: "published",
      reason: "Pubblicazione della vista cliente approvata",
      contentHash: hash,
    });
    await receipt(tx, order, "publish", hashes, order.publicId);
    await appendCommerceAudit(tx, {
      action: "fulfillment.tracking_published",
      objectType: "order",
      objectId: order.publicId,
      outcome: "succeeded",
    });
    return { id: order.publicId, replayed: false };
  });
}
export async function withdrawTracking(
  actor: CommerceActor,
  orderId: string,
  raw: unknown,
) {
  manualActor(actor);
  const v = objectWithKeys(raw, [
      "workspaceRevision",
      "publicationVersion",
      "reason",
      "idempotencyKey",
    ]),
    input = {
      workspaceRevision: integer(v.workspaceRevision),
      publicationVersion: integer(v.publicationVersion),
      reason: text(v.reason, 500),
      idempotencyKey: publicId(v.idempotencyKey),
    };
  return withAtlasCommerceTransaction(actor, async (tx) => {
    const order = await orderFor(tx, orderId, true),
      hashes = await replay(tx, order, "withdraw", input.idempotencyKey, input);
    if (hashes.receipt) return { id: order.publicId, replayed: true };
    current(order, input);
    await clearTrackingProjection(tx, order);
    const p = order.trackingPublication,
      updated = await replaceCommerceRecord(
        tx.internal.orders,
        {
          shopId: tx.shopId,
          id: String(order._id),
          expectedRevision: order.revision,
        },
        {
          trackingPublication: {
            ...(p || { selection: [] }),
            version: input.publicationVersion + 1,
            state: "withdrawn",
          },
        },
        tx.session,
      );
    await recordWorkflowTransition(tx, updated, {
      kind: "publication",
      from: p?.state || "unpublished",
      to: "withdrawn",
      reason: input.reason,
    });
    await receipt(tx, order, "withdraw", hashes, order.publicId);
    await appendCommerceAudit(tx, {
      action: "fulfillment.tracking_withdrawn",
      objectType: "order",
      objectId: order.publicId,
      outcome: "succeeded",
    });
    return { id: order.publicId, replayed: false };
  });
}
/** Text-only draft writer also works after operational closure, without changing execution facts. */
export async function saveCustomerTrackingText(
  actor: CommerceActor,
  orderId: string,
  raw: unknown,
) {
  manualActor(actor);
  const v = objectWithKeys(raw, [
      "kind",
      "cardId",
      "eventId",
      "expectedRevision",
      "customerTitle",
      "customerMessage",
    ]),
    cardId = publicId(v.cardId),
    revision = integer(v.expectedRevision),
    title = text(v.customerTitle, 200, true),
    message = text(v.customerMessage, 3000, true);
  if (
    !["card", "event"].includes(String(v.kind)) ||
    (v.kind === "card" && v.eventId !== undefined)
  )
    checkoutError(400, "INVALID_DRAFT", "Seleziona una scheda o un evento.");
  const eventId = v.kind === "event" ? publicId(v.eventId) : undefined;
  return withAtlasCommerceTransaction(actor, (tx) =>
    withFulfillmentWrite(tx.session, async () => {
      const order = await orderFor(tx, orderId, true),
        card = await cardFor(tx, order, cardId);
      let changed = card;
      if (v.kind === "card") {
        if (card.revision !== revision)
          checkoutError(
            409,
            "FULFILLMENT_CHANGED",
            "Scheda modificata: ricarica i dati.",
          );
        changed = await replaceCommerceRecord(
          tx.internal.fulfillmentLinks,
          {
            shopId: tx.shopId,
            id: String(card._id),
            expectedRevision: card.revision,
          },
          {
            customerTitle: title || undefined,
            customerMessage: message || undefined,
            actor: tx.actor,
          },
          tx.session,
        );
      } else {
        const matches = (await allEvents(tx, order)).filter(
          (e) =>
            e.doc.commerceFulfillment.fulfillmentPublicId === cardId &&
            e.doc.commerceFulfillment.publicId === eventId,
        );
        if (matches.length !== 1)
          checkoutError(
            404,
            "EVENT_NOT_FOUND",
            "Evento non disponibile per questa scheda.",
          );
        const entry = matches[0];
        if (entry.doc.commerceFulfillment.revision !== revision)
          checkoutError(
            409,
            "FULFILLMENT_CHANGED",
            "Evento modificato: ricarica i dati.",
          );
        const Model =
            entry.type === "consegna_ecommerce"
              ? tx.core.deliveryEvents
              : tx.core.progressEvents,
          doc = await Model.findById(entry.doc._id).session(tx.session);
        if (!doc?.commerceFulfillment)
          checkoutError(409, "EVENT_NOT_FOUND", "Evento non disponibile.");
        doc!.commerceFulfillment!.customerTitle = title;
        doc!.commerceFulfillment!.customerMessage = message;
        doc!.commerceFulfillment!.revision += 1;
        doc!.updatedBy = new mongoose.Types.ObjectId(actor.id);
        await doc!.save({ session: tx.session });
        changed = await replaceCommerceRecord(
          tx.internal.fulfillmentLinks,
          {
            shopId: tx.shopId,
            id: String(card._id),
            expectedRevision: card.revision,
          },
          { actor: tx.actor },
          tx.session,
        );
      }
      await mirrorCard(tx, order, changed);
      await markFulfillmentChanged(tx, order);
      await appendCommerceAudit(tx, {
        action: "fulfillment.customer_draft_updated",
        objectType: "order",
        objectId: order.publicId,
        outcome: "succeeded",
      });
      return { id: eventId || cardId };
    }),
  );
}
