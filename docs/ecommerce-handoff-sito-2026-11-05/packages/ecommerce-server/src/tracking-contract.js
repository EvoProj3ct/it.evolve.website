import { CommerceServiceError } from "./errors.js";
const invalid = () => {
  throw new CommerceServiceError(
    502,
    "TRACKING_RESPONSE_INVALID",
    "Risposta tracking non valida.",
  );
};
function exact(value, keys) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !keys.includes(k))
  )
    invalid();
}
function string(value, max, min = 1) {
  if (
    typeof value !== "string" ||
    value.length < min ||
    value.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    invalid();
  return value;
}
const choice = (value, allowed) => {
  if (!allowed.includes(value)) invalid();
  return value;
};
const integer = (value, max = Number.MAX_SAFE_INTEGER, min = 0) => {
  if (!Number.isSafeInteger(value) || value < min || value > max) invalid();
  return value;
};
export function trackingId(value) {
  const id = string(value, 80, 16);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) invalid();
  return id;
}
export function trackingCursor(value) {
  const c = string(value, 512);
  if (!/^[A-Za-z0-9_-]+$/.test(c)) invalid();
  return c;
}
const iso = (value) => {
  const text = string(value, 30);
  const date = new Date(text);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== text)
    invalid();
  return text;
};
function list(value, max, min = 0) {
  if (!Array.isArray(value) || value.length < min || value.length > max)
    invalid();
  return value;
}
function distinct(values) {
  if (new Set(values).size !== values.length) invalid();
}
export function validateTrackingTime(value) {
  exact(value, ["kind", "date", "startsAt", "endsAt", "timeZone"]);
  if (value.timeZone !== "Europe/Rome") invalid();
  if (value.kind === "date") {
    const date = string(value.date, 10),
      parsed = new Date(date + "T12:00:00Z");
    if (
      !/^20\d{2}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date ||
      value.startsAt !== undefined ||
      value.endsAt !== undefined
    )
      invalid();
    return { kind: "date", date, timeZone: "Europe/Rome" };
  }
  const kind = choice(value.kind, ["instant", "window"]),
    startsAt = iso(value.startsAt);
  if (value.date !== undefined) invalid();
  if (kind === "instant") {
    if (value.endsAt !== undefined) invalid();
    return { kind, startsAt, timeZone: "Europe/Rome" };
  }
  const endsAt = iso(value.endsAt);
  if (
    endsAt <= startsAt ||
    new Date(endsAt).getTime() - new Date(startsAt).getTime() > 366 * 86400000
  )
    invalid();
  return { kind, startsAt, endsAt, timeZone: "Europe/Rome" };
}
function delivery(value) {
  exact(value, [
    "publicId",
    "label",
    "mode",
    "phase",
    "message",
    "expected",
    "shippedAt",
    "completedAt",
    "lines",
  ]);
  const mode = choice(value.mode, ["shipping", "pickup", "service"]),
    phase = choice(value.phase, [
      "planned",
      "preparing",
      "shipped",
      "delivered",
      "service_completed",
      "cancelled",
    ]),
    lines = list(value.lines, 100, 1).map((l) => {
      exact(l, ["lineId", "title", "quantity"]);
      return {
        lineId: trackingId(l.lineId),
        title: string(l.title, 200),
        quantity: integer(l.quantity, 1000, 1),
      };
    });
  distinct(lines.map((l) => l.lineId));
  const shippedAt =
      value.shippedAt === undefined ? undefined : iso(value.shippedAt),
    completedAt =
      value.completedAt === undefined ? undefined : iso(value.completedAt);
  if (
    (phase === "shipped" && mode !== "shipping") ||
    (phase === "delivered" && mode === "service") ||
    (phase === "service_completed" && mode !== "service") ||
    !!shippedAt !==
      (mode === "shipping" && ["shipped", "delivered"].includes(phase)) ||
    !!completedAt !== ["delivered", "service_completed"].includes(phase) ||
    (shippedAt && completedAt && completedAt < shippedAt)
  )
    invalid();
  return {
    publicId: trackingId(value.publicId),
    label: string(value.label, 200),
    mode,
    phase,
    ...(value.message === undefined
      ? {}
      : { message: string(value.message, 3000) }),
    ...(value.expected === undefined
      ? {}
      : { expected: validateTrackingTime(value.expected) }),
    ...(shippedAt ? { shippedAt } : {}),
    ...(completedAt ? { completedAt } : {}),
    lines,
  };
}
function event(value) {
  exact(value, [
    "publicId",
    "deliveryPublicId",
    "kind",
    "title",
    "text",
    "status",
    "scheduled",
    "occurredAt",
  ]);
  const status = choice(value.status, ["planned", "completed", "cancelled"]);
  if ((status === "completed") !== (value.occurredAt !== undefined)) invalid();
  return {
    publicId: trackingId(value.publicId),
    deliveryPublicId: trackingId(value.deliveryPublicId),
    kind: choice(value.kind, ["delivery", "progress"]),
    title: string(value.title, 200),
    ...(value.text === undefined ? {} : { text: string(value.text, 3000) }),
    status,
    scheduled: validateTrackingTime(value.scheduled),
    ...(value.occurredAt === undefined
      ? {}
      : { occurredAt: iso(value.occurredAt) }),
  };
}
function base(value, keys, allowUnavailable = true) {
  if (value?.status === "not_available" && allowUnavailable) {
    exact(value, ["orderPublicId", "status"]);
    return {
      orderPublicId: trackingId(value.orderPublicId),
      status: "not_available",
    };
  }
  exact(value, [
    "orderPublicId",
    "status",
    "publicationVersion",
    "publishedAt",
    ...keys,
  ]);
  if (value.status !== "available") invalid();
  return {
    orderPublicId: trackingId(value.orderPublicId),
    status: "available",
    publicationVersion: integer(
      value.publicationVersion,
      Number.MAX_SAFE_INTEGER,
      1,
    ),
    publishedAt: iso(value.publishedAt),
  };
}
export function validatePublicOrderTracking(value) {
  const result = base(value, [
    "phase",
    "fulfillmentStatus",
    "deliveries",
    "eventCount",
  ]);
  if (result.status === "not_available") return result;
  const deliveries = list(value.deliveries, 100).map(delivery);
  distinct(deliveries.map((d) => d.publicId));
  return {
    ...result,
    phase: choice(value.phase, [
      "open",
      "in_progress",
      "on_hold",
      "completed",
      "cancelled",
    ]),
    fulfillmentStatus: choice(value.fulfillmentStatus, [
      "unfulfilled",
      "in_progress",
      "partial",
      "fulfilled",
      "cancelled",
    ]),
    deliveries,
    eventCount: integer(value.eventCount, 500),
  };
}
export function validatePublicTrackingTimeline(value) {
  const result = base(value, ["events", "pageSize", "nextCursor"]);
  if (result.status === "not_available") return result;
  if (value.pageSize !== 20) invalid();
  const events = list(value.events, 20).map(event);
  distinct(events.map((e) => e.publicId));
  if (value.nextCursor !== null && events.length !== 20) invalid();
  return {
    ...result,
    events,
    pageSize: 20,
    nextCursor:
      value.nextCursor === null ? null : trackingCursor(value.nextCursor),
  };
}
export function validatePublicTrackingDelivery(value) {
  return {
    ...base(value, ["delivery", "eventCount"], false),
    delivery: delivery(value.delivery),
    eventCount: integer(value.eventCount, 500),
  };
}
