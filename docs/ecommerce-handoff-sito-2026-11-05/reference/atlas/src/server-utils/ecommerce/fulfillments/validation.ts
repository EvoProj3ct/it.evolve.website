import "server-only";
import {
  checkoutError,
  objectWithKeys,
  integer,
  publicId,
  plain,
} from "../checkout/validation";
import { text } from "../catalog/validation";
import { isCommerceEventType } from "@/config/ecommerce-fulfillment.config";
import type { FulfillmentTime } from "./types";
import {
  buildDayEndUtcIso,
  getIsoDayInTimeZone,
} from "@/components/AtlasModuli/Calendario/utils";
export function instant(value: unknown): string {
  const iso = plain(value, 30);
  const date = new Date(iso);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString() !== iso ||
    date.getUTCFullYear() < 2000 ||
    date.getUTCFullYear() > 2100
  )
    checkoutError(
      400,
      "INVALID_TIME",
      "Usa una data e ora valide con fuso orario.",
    );
  return iso;
}
export function expectation(value: unknown): FulfillmentTime {
  const v = objectWithKeys(value, [
    "kind",
    "date",
    "startsAt",
    "endsAt",
    "timeZone",
  ]);
  if (v.timeZone !== "Europe/Rome")
    checkoutError(
      400,
      "INVALID_TIME_ZONE",
      "Il calendario usa il fuso Europe/Rome.",
    );
  if (v.kind === "date") {
    const date = plain(v.date, 10);
    const parsed = new Date(date + "T12:00:00Z");
    if (
      !/^20\d{2}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date ||
      v.startsAt !== undefined ||
      v.endsAt !== undefined
    )
      checkoutError(400, "INVALID_TIME", "La data prevista non è valida.");
    return { kind: "date", date, timeZone: "Europe/Rome" };
  }
  if (!["instant", "window"].includes(String(v.kind)) || v.date !== undefined)
    checkoutError(400, "INVALID_TIME", "Previsione non valida.");
  const startsAt = instant(v.startsAt);
  if (v.kind === "instant") {
    if (v.endsAt !== undefined)
      checkoutError(400, "INVALID_TIME", "L’istante non prevede una fine.");
    return { kind: "instant", startsAt, timeZone: "Europe/Rome" };
  }
  const endsAt = instant(v.endsAt);
  if (
    endsAt <= startsAt ||
    new Date(endsAt).getTime() - new Date(startsAt).getTime() > 366 * 86400000
  )
    checkoutError(
      400,
      "INVALID_TIME",
      "La fine deve seguire l’inizio, entro un anno.",
    );
  return { kind: "window", startsAt, endsAt, timeZone: "Europe/Rome" };
}
export function coreTiming(expected: FulfillmentTime) {
  if (expected.kind === "date")
    return {
      timeKind: "deadline" as const,
      startAt: null,
      endAt: new Date(buildDayEndUtcIso(expected.date)),
      allDay: true,
    };
  return {
    timeKind:
      expected.kind === "window" ? ("interval" as const) : ("point" as const),
    startAt: new Date(expected.startsAt),
    endAt: expected.endsAt ? new Date(expected.endsAt) : null,
    allDay: false,
  };
}
export function calendarTime(value: unknown) {
  const v = objectWithKeys(value, [
    "expectedRevision",
    "startAt",
    "endAt",
    "allDay",
  ]);
  const start = instant(v.startAt),
    end = instant(v.endAt);
  if (typeof v.allDay !== "boolean")
    checkoutError(400, "INVALID_TIME", "Specifica il tipo di previsione.");
  if (v.allDay) {
    if (getIsoDayInTimeZone(start) !== getIsoDayInTimeZone(end))
      checkoutError(
        400,
        "INVALID_TIME",
        "Per più giorni usa una finestra con orari.",
      );
    return {
      revision: integer(v.expectedRevision),
      expected: expectation({
        kind: "date",
        date: getIsoDayInTimeZone(start),
        timeZone: "Europe/Rome",
      }),
    };
  }
  return {
    revision: integer(v.expectedRevision),
    expected: expectation({
      kind: start === end ? "instant" : "window",
      startsAt: start,
      ...(start === end ? {} : { endsAt: end }),
      timeZone: "Europe/Rome",
    }),
  };
}
export function cardInput(value: unknown, create: boolean) {
  const v = objectWithKeys(value, [
    "title",
    "mode",
    "status",
    "internalNotes",
    "customerMessage",
    "customerTitle",
    "allocations",
    create ? "idempotencyKey" : "expectedRevision",
  ]);
  if (
    !["shipping", "pickup", "service"].includes(String(v.mode)) ||
    !["active", "cancelled"].includes(String(v.status)) ||
    (create && v.status !== "active")
  )
    checkoutError(400, "INVALID_CARD", "Modalità o stato scheda non validi.");
  if (
    !Array.isArray(v.allocations) ||
    v.allocations.length < 1 ||
    v.allocations.length > 100
  )
    checkoutError(
      400,
      "INVALID_ALLOCATIONS",
      "Seleziona le righe e le quantità.",
    );
  const allocations = v.allocations.map((raw) => {
    const line = objectWithKeys(raw, ["lineId", "quantity"]);
    return {
      lineId: publicId(line.lineId),
      quantity: integer(line.quantity, 1000, 1),
    };
  });
  if (new Set(allocations.map((a) => a.lineId)).size !== allocations.length)
    checkoutError(400, "INVALID_ALLOCATIONS", "Righe duplicate.");
  return {
    title: text(v.title, 200),
    mode: v.mode as "shipping" | "pickup" | "service",
    status: v.status as "active" | "cancelled",
    internalNotes: text(v.internalNotes, 5000, true),
    customerMessage: text(v.customerMessage, 3000, true),
    customerTitle:
      v.customerTitle === undefined ? "" : text(v.customerTitle, 200, true),
    allocations,
    ...(create
      ? { idempotencyKey: publicId(v.idempotencyKey) }
      : { expectedRevision: integer(v.expectedRevision) }),
  };
}
export function eventInput(value: unknown, create: boolean) {
  const v = objectWithKeys(value, [
    "type",
    "title",
    "internalNotes",
    "customerMessage",
    "customerTitle",
    "state",
    "expected",
    "actualAt",
    "primary",
    create ? "idempotencyKey" : "expectedRevision",
  ]);
  if (
    !isCommerceEventType(String(v.type)) ||
    !["programmato", "completato", "annullato"].includes(String(v.state)) ||
    typeof v.primary !== "boolean"
  )
    checkoutError(400, "INVALID_EVENT", "Evento non valido.");
  if ((v.state === "completato") !== (v.actualAt !== null))
    checkoutError(
      400,
      "INVALID_ACTUAL_TIME",
      "Indica la data effettiva solo per un evento completato.",
    );
  return {
    type: v.type as "consegna_ecommerce" | "avanzamento_ecommerce",
    title: text(v.title, 200),
    internalNotes: text(v.internalNotes, 5000, true),
    customerMessage: text(v.customerMessage, 3000, true),
    customerTitle:
      v.customerTitle === undefined ? "" : text(v.customerTitle, 200, true),
    state: v.state as "programmato" | "completato" | "annullato",
    expected: expectation(v.expected),
    actualAt: v.actualAt === null ? null : instant(v.actualAt),
    primary: v.primary,
    ...(create
      ? { idempotencyKey: publicId(v.idempotencyKey) }
      : { expectedRevision: integer(v.expectedRevision) }),
  };
}
