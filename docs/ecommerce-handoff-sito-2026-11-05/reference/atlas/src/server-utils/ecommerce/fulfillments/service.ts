import "server-only";
import mongoose from "mongoose";
import { randomUUID, createHash } from "node:crypto";
import {
  stableJson,
  replaceCommerceRecord,
  type CommerceActor,
} from "@evolve/ecommerce-server/persistence";
import {
  withAtlasCommerceTransaction,
  getAtlasCommerceStorage,
  type AtlasCommerceTransaction,
} from "../persistence/atlas-storage";
import { appendCommerceAudit } from "../persistence/core-adapters";
import { checkoutError, objectId } from "../checkout/validation";
import { cardInput, eventInput, coreTiming, calendarTime } from "./validation";
import { withFulfillmentWrite } from "./guard";
import { markFulfillmentChanged, phaseForCard } from "./state";
import type {
  FulfillmentCard,
  FulfillmentEvent,
  OrderFulfillments,
} from "./types";
import {
  COMMERCE_DELIVERY_TYPE,
  type CommerceEventType,
} from "@/config/ecommerce-fulfillment.config";
const hash = (value: unknown) =>
  createHash("sha256").update(stableJson(value)).digest("hex");
const oid = (id: string) => new mongoose.Types.ObjectId(id);
const eventModel = (tx: AtlasCommerceTransaction, type: CommerceEventType) =>
  type === "consegna_ecommerce"
    ? tx.core.deliveryEvents
    : tx.core.progressEvents;
const scope = (tx: AtlasCommerceTransaction, orderId: string) => ({
  "commerceFulfillment.shopId": tx.shopId,
  "commerceFulfillment.orderPublicId": orderId,
});
const failChanged = () =>
  checkoutError(
    409,
    "FULFILLMENT_CHANGED",
    "La scheda o l’evento sono cambiati. Ricarica prima di riprovare.",
  );
export function manualActor(actor: CommerceActor) {
  if (actor.kind !== "staff")
    checkoutError(
      403,
      "STAFF_ACTION_REQUIRED",
      "Questa operazione richiede un operatore Atlas.",
    );
}

export async function orderFor(
  tx: AtlasCommerceTransaction,
  id: string,
  write = false,
) {
  const filter = { shopId: tx.shopId, publicId: id };
  const order = write
    ? await tx.internal.orders
        .findOneAndUpdate(
          filter,
          { $inc: { guard: 1 } },
          { new: true, session: tx.session },
        )
        .lean()
    : await tx.internal.orders.findOne(filter).session(tx.session).lean();
  if (!order) checkoutError(404, "ORDER_NOT_FOUND", "Ordine non disponibile.");
  return order!;
}
function writable(order: any) {
  if (["cancelled", "completed"].includes(order.operationalStatus))
    checkoutError(
      409,
      "ORDER_CLOSED",
      "L’ordine è chiuso: non è possibile modificare la pianificazione.",
    );
}
export async function cardFor(
  tx: AtlasCommerceTransaction,
  order: any,
  id: string,
) {
  const card = await tx.internal.fulfillmentLinks
    .findOne({ shopId: tx.shopId, orderId: order._id, publicId: id })
    .session(tx.session)
    .lean();
  if (!card)
    checkoutError(
      404,
      "FULFILLMENT_NOT_FOUND",
      "Scheda non disponibile per questo ordine.",
    );
  return card!;
}
export async function allEvents(tx: AtlasCommerceTransaction, order: any) {
  const result: { type: CommerceEventType; doc: any }[] = [];
  for (const type of ["consegna_ecommerce", "avanzamento_ecommerce"] as const) {
    const docs = await eventModel(tx, type)
      .find(scope(tx, order.publicId))
      .sort({ createdAt: 1, _id: 1 })
      .limit(501)
      .session(tx.session)
      .lean();
    result.push(...docs.map((doc) => ({ type, doc })));
  }
  if (result.length > 500)
    checkoutError(
      409,
      "FULFILLMENT_LIMIT",
      "Troppi eventi per l’ordine. Verifica i dati interni.",
    );
  return result;
}
function eventDto(
  type: CommerceEventType,
  doc: any,
  card: any,
): FulfillmentEvent {
  const m = doc.commerceFulfillment;
  return {
    id: m.publicId,
    coreId: String(doc._id),
    type,
    revision: m.revision,
    title: doc.data.titolo,
    internalNotes: doc.data.descrizione || "",
    customerMessage: m.customerMessage || "",
    customerTitle: m.customerTitle || "",
    state: doc.data.stato,
    expected: m.expectation,
    actualAt: m.actualAt ? new Date(m.actualAt).toISOString() : null,
    primary: String(card.primaryPlannedEventId || "") === String(doc._id),
  };
}
async function cardDto(
  tx: AtlasCommerceTransaction,
  card: any,
  events: Awaited<ReturnType<typeof allEvents>>,
): Promise<FulfillmentCard> {
  const core = await tx.core.deliveries
    .exists({
      _id: card.deliveryAnagraficaId,
      "commerceOrigin.shopId": tx.shopId,
    })
    .session(tx.session);
  if (!core || !card.mode || !card.title)
    checkoutError(
      409,
      "FULFILLMENT_INCONSISTENT",
      "Anagrafica consegna non coerente: verifica interna necessaria.",
    );
  return {
    id: card.publicId,
    coreId: String(card.deliveryAnagraficaId),
    revision: card.revision,
    title: card.title,
    mode: card.mode,
    status: card.status || "active",
    internalNotes: card.internalNotes || "",
    customerMessage: card.customerMessage || "",
    customerTitle: card.customerTitle || "",
    phase: card.phase || "planned",
    shippedAt: card.shippedAt ? new Date(card.shippedAt).toISOString() : null,
    completedAt: card.completedAt
      ? new Date(card.completedAt).toISOString()
      : null,
    allocations: card.allocations.map((a: any) => ({
      lineId: a.lineId,
      quantity: a.quantity,
    })),
    events: events
      .filter(
        (e) => e.doc.commerceFulfillment.fulfillmentPublicId === card.publicId,
      )
      .map((e) => eventDto(e.type, e.doc, card)),
  };
}
export async function orderFulfillments(
  actor: CommerceActor,
  id: string,
): Promise<OrderFulfillments> {
  manualActor(actor);
  return withAtlasCommerceTransaction(actor, async (tx) => {
    const order = await orderFor(tx, id),
      events = await allEvents(tx, order);
    const cards = await tx.internal.fulfillmentLinks
      .find({ shopId: tx.shopId, orderId: order._id })
      .sort({ createdAt: 1, _id: 1 })
      .limit(101)
      .session(tx.session)
      .lean();
    if (cards.length > 100)
      checkoutError(409, "FULFILLMENT_LIMIT", "Troppe schede per l’ordine.");
    const result: FulfillmentCard[] = [];
    for (const card of cards) result.push(await cardDto(tx, card, events));
    const history = await tx.internal.workflowTransitions
      .find({ shopId: tx.shopId, orderId: order._id })
      .sort({ occurredAt: -1, _id: -1 })
      .limit(50)
      .session(tx.session)
      .lean();
    const publication = order.trackingPublication;
    return {
      orderId: order.publicId,
      orderNumber: order.number,
      cards: result,
      workspaceRevision: order.fulfillmentRevision || 0,
      order: {
        revision: order.revision,
        operationalStatus: order.operationalStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        paymentStatus: order.paymentStatus,
        requiresPaymentReview: !!order.paymentSummary?.requiresReview,
        fulfillment: order.fulfillment.map((l: any) => ({
          lineId: l.lineId,
          state: l.state,
          fulfilledQuantity: l.fulfilledQuantity,
          shippedQuantity: l.shippedQuantity || 0,
        })),
      },
      publication: {
        version: publication?.version || 0,
        state: publication?.state || "unpublished",
        publishedAt: publication?.publishedAt
          ? new Date(publication.publishedAt).toISOString()
          : null,
        selection: (publication?.selection || []).map((s: any) => ({
          cardId: s.cardId,
          eventIds: [...s.eventIds],
        })),
      },
      history: history.map((h: any) => ({
        kind: h.kind,
        ...(h.cardPublicId ? { cardId: h.cardPublicId } : {}),
        from: h.from,
        to: h.to,
        reason: h.reason,
        occurredAt: new Date(h.occurredAt).toISOString(),
      })),
    };
  });
}
async function checkAllocations(
  tx: AtlasCommerceTransaction,
  order: any,
  input: ReturnType<typeof cardInput>,
  previous?: any,
) {
  if (!order.fulfillmentSelections?.some((s: any) => s.mode === input.mode))
    checkoutError(
      409,
      "FULFILLMENT_MODE",
      "La modalità non è tra quelle confermate nell’ordine.",
    );
  const others = await tx.internal.fulfillmentLinks
    .find({
      shopId: tx.shopId,
      orderId: order._id,
      ...(previous ? { _id: { $ne: previous._id } } : {}),
    })
    .limit(101)
    .session(tx.session)
    .lean();
  if (!previous && others.length >= 100)
    checkoutError(409, "FULFILLMENT_LIMIT", "Limite di 100 schede per ordine.");
  for (const a of input.allocations) {
    const line = order.lines.find((l: any) => l.lineId === a.lineId);
    if (
      !line ||
      line.kind === "delivery" ||
      a.quantity > line.quantity ||
      (line.kind === "service") !== (input.mode === "service")
    )
      checkoutError(
        400,
        "INVALID_ALLOCATIONS",
        "Assegna solo prodotti o servizi compatibili con la modalità.",
      );
    const used = others
      .filter((c: any) => c.status !== "cancelled")
      .reduce(
        (sum: number, c: any) =>
          sum +
          c.allocations
            .filter((x: any) => x.lineId === a.lineId)
            .reduce((n: number, x: any) => n + x.quantity, 0),
        0,
      );
    if (input.status !== "cancelled" && used + a.quantity > line.quantity)
      checkoutError(
        409,
        "QUANTITY_ALREADY_ASSIGNED",
        "Le quantità superano quelle ordinate o sono già assegnate ad altre schede.",
      );
  }
}
export async function mirrorCard(
  tx: AtlasCommerceTransaction,
  order: any,
  card: any,
  create = false,
) {
  const primary = card.primaryPlannedEventId
    ? await tx.core.deliveryEvents
        .findOne({
          _id: card.primaryPlannedEventId,
          ...scope(tx, order.publicId),
          "commerceFulfillment.fulfillmentPublicId": card.publicId,
          "data.stato": { $ne: "annullato" },
        })
        .session(tx.session)
        .lean()
    : null;
  if (card.primaryPlannedEventId && !primary)
    checkoutError(
      409,
      "PRIMARY_EVENT_INVALID",
      "Evento principale non coerente con la scheda.",
    );
  const data = {
    titoloConsegnaEcommerce: card.title,
    numeroOrdine: order.number,
    codiceCliente: order.customerId,
    modalitaConsegnaEcommerce: card.mode,
    statoSchedaEcommerce: card.status || "active",
    note: card.internalNotes || "",
    messaggioClienteEcommerce: card.customerMessage || "",
    titoloClienteEcommerce: card.customerTitle || "",
    faseConsegnaEcommerce: phaseForCard(card),
    spedizioneEffettivaEcommerce: card.shippedAt || null,
    completamentoEffettivoEcommerce: card.completedAt || null,
    dataConsegna: primary ? primary.endAt || primary.startAt : null,
  };
  const record = create
    ? new tx.core.deliveries({
        _id: card.deliveryAnagraficaId,
        data,
        owner: tx.responsibleOwnerId,
        createdBy: oid(tx.actor.id),
        visibilityRoles: tx.visibilityRoles,
        commerceOrigin: {
          shopId: tx.shopId,
          key: `fulfillment:${card.publicId}`,
          actor: tx.actor,
        },
      })
    : await tx.core.deliveries
        .findOne({
          _id: card.deliveryAnagraficaId,
          "commerceOrigin.shopId": tx.shopId,
        })
        .session(tx.session);
  if (!record)
    checkoutError(
      409,
      "FULFILLMENT_INCONSISTENT",
      "Anagrafica consegna non disponibile.",
    );
  record!.data = data;
  record!.updatedBy = oid(tx.actor.id);
  await record!.save({ session: tx.session });
}
export async function replay(
  tx: AtlasCommerceTransaction,
  order: any,
  kind: "card" | "event" | "phase" | "order" | "publish" | "withdraw",
  key: string,
  content: unknown,
) {
  const keyHash = hash(key),
    requestHash = hash(content);
  const receipt = await tx.internal.fulfillmentRequests
    .findOne({ shopId: tx.shopId, staffId: tx.actor.id, kind, keyHash })
    .session(tx.session)
    .lean();
  if (
    receipt &&
    (receipt.requestHash !== requestHash ||
      String(receipt.orderId) !== String(order._id))
  )
    checkoutError(
      409,
      "IDEMPOTENCY_CONFLICT",
      "Chiave già usata con dati diversi.",
    );
  return { receipt, keyHash, requestHash };
}
export async function receipt(
  tx: AtlasCommerceTransaction,
  order: any,
  kind: "card" | "event" | "phase" | "order" | "publish" | "withdraw",
  hashes: { keyHash: string; requestHash: string },
  resultPublicId: string,
) {
  await new tx.internal.fulfillmentRequests({
    shopId: tx.shopId,
    staffId: tx.actor.id,
    orderId: order._id,
    kind,
    keyHash: hashes.keyHash,
    requestHash: hashes.requestHash,
    resultPublicId,
  }).save({ session: tx.session });
}
export async function saveCard(
  actor: CommerceActor,
  orderId: string,
  raw: unknown,
  id?: string,
) {
  manualActor(actor);
  const input = cardInput(raw, !id);
  return withAtlasCommerceTransaction(actor, (tx) =>
    withFulfillmentWrite(tx.session, async () => {
      const order = await orderFor(tx, orderId, true);
      const hashes = !id
        ? await replay(tx, order, "card", input.idempotencyKey!, {
            orderId,
            input,
          })
        : null;
      if (hashes?.receipt)
        return { id: hashes.receipt.resultPublicId, replayed: true };
      writable(order);
      const previous = id ? await cardFor(tx, order, id) : null;
      if (previous && previous.revision !== input.expectedRevision)
        failChanged();
      await checkAllocations(tx, order, input, previous);
      if (previous) {
        const events = (await allEvents(tx, order)).filter(
          (e) => e.doc.commerceFulfillment.fulfillmentPublicId === id,
        );
        const lockedPhase = [
          "shipped",
          "delivered",
          "service_completed",
        ].includes(phaseForCard(previous));
        if (input.status === "cancelled" && lockedPhase)
          checkoutError(
            409,
            "FULFILLMENT_EXECUTED",
            "Una scheda spedita o completata conserva il proprio storico.",
          );
        if (
          input.status === "active" &&
          previous.status === "cancelled" &&
          phaseForCard({ ...previous, status: "active" }) !== "planned" &&
          (order.paymentStatus !== "paid" ||
            order.paymentSummary?.requiresReview ||
            order.operationalStatus === "on_hold")
        )
          checkoutError(
            409,
            "PAYMENT_NOT_CONFIRMED",
            "Verifica incasso e sospensione prima di riprendere la preparazione.",
          );
        if (
          input.mode !== previous.mode &&
          (previous.phase || "planned") !== "planned"
        )
          checkoutError(
            409,
            "FULFILLMENT_IN_PROGRESS",
            "La modalità è già in lavorazione.",
          );
        if (input.mode !== previous.mode && events.length)
          checkoutError(
            409,
            "FULFILLMENT_HAS_EVENTS",
            "La modalità non può cambiare dopo la creazione di eventi.",
          );
        const allocationsKey = (rows: { lineId: string; quantity: number }[]) =>
          stableJson(
            rows
              .map(({ lineId, quantity }) => ({ lineId, quantity }))
              .sort((a, b) => a.lineId.localeCompare(b.lineId)),
          );
        if (
          (lockedPhase ||
            events.some((e) => e.doc.data.stato === "completato")) &&
          allocationsKey(previous.allocations) !==
            allocationsKey(input.allocations)
        )
          checkoutError(
            409,
            "FULFILLMENT_COMPLETED_EVENT",
            "Le quantità con eventi completati conservano la loro assegnazione storica.",
          );
        if (
          input.status === "cancelled" &&
          events.some((e) => e.doc.data.stato !== "annullato")
        )
          checkoutError(
            409,
            "FULFILLMENT_HAS_EVENTS",
            "Annulla prima gli eventi della scheda. Gli eventi completati restano nello storico.",
          );
      }
      const {
        idempotencyKey: _key,
        expectedRevision: _rev,
        ...content
      } = input;
      const values = {
        ...content,
        internalNotes: content.internalNotes || undefined,
        customerMessage: content.customerMessage || undefined,
        customerTitle: content.customerTitle || undefined,
      };
      const card = previous
        ? await replaceCommerceRecord(
            tx.internal.fulfillmentLinks,
            {
              shopId: tx.shopId,
              id: String(previous._id),
              expectedRevision: previous.revision,
            },
            { ...values, actor: tx.actor },
            tx.session,
          )
        : await new tx.internal.fulfillmentLinks({
            shopId: tx.shopId,
            publicId: randomUUID(),
            orderId: order._id,
            deliveryAnagraficaId: new mongoose.Types.ObjectId(),
            ...values,
            actor: tx.actor,
          }).save({ session: tx.session });
      await mirrorCard(tx, order, card, !previous);
      await markFulfillmentChanged(tx, order);
      if (hashes) await receipt(tx, order, "card", hashes, card.publicId);
      await appendCommerceAudit(tx, {
        action: previous ? "fulfillment.updated" : "fulfillment.created",
        objectType: "order",
        objectId: order.publicId,
        outcome: "succeeded",
      });
      return { id: card.publicId, replayed: false };
    }),
  );
}
async function updateCardBinding(
  tx: AtlasCommerceTransaction,
  order: any,
  card: any,
  primaryId?: mongoose.Types.ObjectId,
) {
  const changed = await replaceCommerceRecord(
    tx.internal.fulfillmentLinks,
    {
      shopId: tx.shopId,
      id: String(card._id),
      expectedRevision: card.revision,
    },
    {
      ...(primaryId === undefined ? {} : { primaryPlannedEventId: primaryId }),
      actor: tx.actor,
    },
    tx.session,
  );
  await mirrorCard(tx, order, changed);
  return changed;
}
async function clearPrimary(
  tx: AtlasCommerceTransaction,
  order: any,
  card: any,
) {
  // replaceCommerceRecord removes optional fields explicitly with undefined.
  const changed = await replaceCommerceRecord(
    tx.internal.fulfillmentLinks,
    {
      shopId: tx.shopId,
      id: String(card._id),
      expectedRevision: card.revision,
    },
    { primaryPlannedEventId: undefined, actor: tx.actor },
    tx.session,
  );
  await mirrorCard(tx, order, changed);
}
export async function saveEvent(
  actor: CommerceActor,
  orderId: string,
  cardId: string,
  raw: unknown,
  eventId?: string,
) {
  manualActor(actor);
  const input = eventInput(raw, !eventId);
  return withAtlasCommerceTransaction(actor, (tx) =>
    withFulfillmentWrite(tx.session, async () => {
      const order = await orderFor(tx, orderId, true),
        card = await cardFor(tx, order, cardId);
      const hashes = !eventId
        ? await replay(tx, order, "event", input.idempotencyKey!, {
            orderId,
            cardId,
            input,
          })
        : null;
      if (hashes?.receipt)
        return { id: hashes.receipt.resultPublicId, replayed: true };
      writable(order);
      if (card.status === "cancelled")
        checkoutError(409, "FULFILLMENT_CANCELLED", "La scheda è annullata.");
      const events = await allEvents(tx, order),
        existing = eventId
          ? events.find(
              (e) =>
                e.doc.commerceFulfillment.publicId === eventId &&
                e.doc.commerceFulfillment.fulfillmentPublicId === cardId,
            )
          : undefined;
      if (eventId && !existing)
        checkoutError(
          404,
          "EVENT_NOT_FOUND",
          "Evento non disponibile per questa scheda.",
        );
      if (
        existing &&
        (existing.doc.commerceFulfillment.revision !== input.expectedRevision ||
          existing.type !== input.type)
      )
        failChanged();
      if (!existing && events.length >= 500)
        checkoutError(
          409,
          "FULFILLMENT_LIMIT",
          "Limite di 500 eventi per ordine.",
        );
      if (
        existing &&
        existing.doc.data.stato !== "programmato" &&
        (existing.doc.data.stato !== input.state ||
          stableJson(existing.doc.commerceFulfillment.expectation) !==
            stableJson(input.expected))
      )
        checkoutError(
          409,
          "EVENT_CLOSED",
          "Un evento concluso conserva stato e previsione storica.",
        );
      if (
        input.primary &&
        (input.type !== "consegna_ecommerce" || input.state === "annullato")
      )
        checkoutError(
          400,
          "INVALID_PRIMARY_EVENT",
          "La previsione principale richiede un evento consegna non annullato.",
        );
      if (
        input.actualAt &&
        (new Date(input.actualAt).getTime() > Date.now() + 300000 ||
          new Date(input.actualAt).getTime() <
            new Date(order.placedAt).getTime())
      )
        checkoutError(
          400,
          "INVALID_ACTUAL_TIME",
          "La data effettiva deve seguire l’ordine e non può essere futura.",
        );
      if (
        input.state === "completato" &&
        existing?.doc.data.stato !== "completato" &&
        (order.paymentStatus !== "paid" ||
          order.paymentSummary?.requiresReview ||
          order.operationalStatus === "on_hold")
      )
        checkoutError(
          409,
          "PAYMENT_NOT_CONFIRMED",
          "Verifica l’incasso prima di registrare un evento completato.",
        );
      const Model = eventModel(tx, input.type);
      const record = existing
        ? await Model.findById(existing.doc._id).session(tx.session)
        : new Model({
            _autoEvent: null,
            owner: tx.responsibleOwnerId,
            createdBy: oid(tx.actor.id),
            visibilityRole: "Commerciale",
            partecipanti: [
              {
                anagraficaType: COMMERCE_DELIVERY_TYPE,
                anagraficaId: card.deliveryAnagraficaId,
                role: "consegna",
              },
            ],
            commerceFulfillment: {
              shopId: tx.shopId,
              publicId: randomUUID(),
              orderPublicId: order.publicId,
              fulfillmentPublicId: card.publicId,
              revision: 0,
              expectation: input.expected,
            },
          });
      if (!record || !record.commerceFulfillment)
        checkoutError(409, "EVENT_NOT_FOUND", "Evento non disponibile.");
      record!.data = {
        titolo: input.title,
        descrizione: input.internalNotes,
        stato: input.state,
      };
      Object.assign(record!, coreTiming(input.expected));
      const binding = record!.commerceFulfillment!;
      binding.revision = existing ? input.expectedRevision! + 1 : 0;
      binding.expectation = input.expected;
      binding.actualAt = input.actualAt ? new Date(input.actualAt) : null;
      binding.customerMessage = input.customerMessage;
      binding.customerTitle = input.customerTitle;
      record!.updatedBy = oid(tx.actor.id);
      await record!.save({ session: tx.session });
      const wasPrimary =
        String(card.primaryPlannedEventId || "") === String(record!._id);
      if (input.primary) await updateCardBinding(tx, order, card, record!._id);
      else if (wasPrimary) await clearPrimary(tx, order, card);
      else await updateCardBinding(tx, order, card);
      await markFulfillmentChanged(tx, order);
      if (hashes)
        await receipt(
          tx,
          order,
          "event",
          hashes,
          record!.commerceFulfillment!.publicId,
        );
      await appendCommerceAudit(tx, {
        action: existing
          ? "fulfillment.event_updated"
          : "fulfillment.event_created",
        objectType: "order",
        objectId: order.publicId,
        outcome: "succeeded",
      });
      return { id: record!.commerceFulfillment!.publicId, replayed: false };
    }),
  );
}
export async function moveCalendarEvent(
  actor: CommerceActor,
  type: CommerceEventType,
  id: string,
  raw: unknown,
) {
  manualActor(actor);
  const input = calendarTime(raw);
  return withAtlasCommerceTransaction(actor, (tx) =>
    withFulfillmentWrite(tx.session, async () => {
      const Model = eventModel(tx, type),
        record = await Model.findOne({
          _id: objectId(id),
          "commerceFulfillment.shopId": tx.shopId,
        }).session(tx.session);
      if (!record?.commerceFulfillment)
        checkoutError(404, "EVENT_NOT_FOUND", "Evento non disponibile.");
      const m = record!.commerceFulfillment!,
        order = await orderFor(tx, m.orderPublicId, true),
        card = await cardFor(tx, order, m.fulfillmentPublicId);
      writable(order);
      if (m.revision !== input.revision) failChanged();
      if (record!.data.stato !== "programmato" || card.status === "cancelled")
        checkoutError(
          409,
          "EVENT_CLOSED",
          "Solo gli eventi programmati di schede attive possono essere spostati.",
        );
      Object.assign(record!, coreTiming(input.expected));
      m.expectation = input.expected;
      m.revision += 1;
      record!.updatedBy = oid(tx.actor.id);
      await record!.save({ session: tx.session });
      await updateCardBinding(tx, order, card);
      await markFulfillmentChanged(tx, order);
      await appendCommerceAudit(tx, {
        action: "fulfillment.event_rescheduled",
        objectType: "order",
        objectId: order.publicId,
        outcome: "succeeded",
      });
    }),
  );
}
export async function fulfillmentOrderFromCore(
  kind: "card" | CommerceEventType,
  id: string,
) {
  const storage = await getAtlasCommerceStorage(),
    shopId = process.env.ECOMMERCE_SHOP_ID;
  if (kind === "card") {
    const link = await storage.internal.fulfillmentLinks
      .findOne({ shopId, deliveryAnagraficaId: objectId(id) })
      .lean();
    const order = link
      ? await storage.internal.orders
          .findOne({ shopId, _id: link.orderId })
          .select({ publicId: 1 })
          .lean()
      : null;
    return order?.publicId as string | undefined;
  }
  const doc = await (
    kind === "consegna_ecommerce"
      ? storage.core.deliveryEvents
      : storage.core.progressEvents
  )
    .findOne({ _id: objectId(id), "commerceFulfillment.shopId": shopId })
    .lean();
  return doc?.commerceFulfillment?.orderPublicId;
}
export async function listFulfillments(cursor?: string) {
  const storage = await getAtlasCommerceStorage(),
    shopId = process.env.ECOMMERCE_SHOP_ID;
  const rows = await storage.internal.fulfillmentLinks
    .find({ shopId, ...(cursor ? { _id: { $lt: objectId(cursor) } } : {}) })
    .sort({ _id: -1 })
    .limit(31)
    .lean();
  const items = [];
  for (const card of rows.slice(0, 30)) {
    const order = await storage.internal.orders
      .findOne({ shopId, _id: card.orderId })
      .select({ publicId: 1, number: 1 })
      .lean();
    if (order)
      items.push({
        id: card.publicId,
        title: card.title || "Scheda consegna",
        mode: card.mode,
        status: card.status || "active",
        phase: card.phase || "planned",
        completedAt: card.completedAt
          ? new Date(card.completedAt).toISOString()
          : null,
        orderId: order.publicId,
        orderNumber: order.number,
      });
  }
  return { items, nextCursor: rows.length > 30 ? String(rows[29]._id) : null };
}
