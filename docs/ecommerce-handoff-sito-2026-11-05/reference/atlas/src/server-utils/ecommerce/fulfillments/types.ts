import type { CommerceEventType } from "@/config/ecommerce-fulfillment.config";
import type { FulfillmentPhase } from "@/config/ecommerce-fulfillment.config";
export type FulfillmentTime =
  | { kind: "date"; date: string; timeZone: "Europe/Rome" }
  | {
      kind: "instant" | "window";
      startsAt: string;
      endsAt?: string;
      timeZone: "Europe/Rome";
    };
export interface FulfillmentEvent {
  id: string;
  coreId: string;
  type: CommerceEventType;
  revision: number;
  title: string;
  internalNotes: string;
  customerMessage: string;
  customerTitle: string;
  state: "programmato" | "completato" | "annullato";
  expected: FulfillmentTime;
  actualAt: string | null;
  primary: boolean;
}
export interface FulfillmentCard {
  id: string;
  coreId: string;
  revision: number;
  title: string;
  mode: "shipping" | "pickup" | "service";
  status: "active" | "cancelled";
  internalNotes: string;
  customerMessage: string;
  customerTitle: string;
  phase: FulfillmentPhase;
  shippedAt: string | null;
  completedAt: string | null;
  allocations: { lineId: string; quantity: number }[];
  events: FulfillmentEvent[];
}
export interface OrderFulfillments {
  orderId: string;
  orderNumber: string;
  cards: FulfillmentCard[];
  workspaceRevision: number;
  order: {
    revision: number;
    operationalStatus: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    requiresPaymentReview: boolean;
    fulfillment: {
      lineId: string;
      state: string;
      fulfilledQuantity: number;
      shippedQuantity: number;
    }[];
  };
  publication: {
    version: number;
    state: "unpublished" | "published" | "stale" | "withdrawn";
    publishedAt: string | null;
    selection: TrackingSelection;
  };
  history: {
    kind: string;
    cardId?: string;
    from: string;
    to: string;
    reason: string;
    occurredAt: string;
  }[];
}
export type TrackingSelection = { cardId: string; eventIds: string[] }[];
export interface TrackingSnapshot {
  orderPublicId: string;
  phase: string;
  fulfillmentStatus: string;
  deliveries: {
    publicId: string;
    label: string;
    mode: "shipping" | "pickup" | "service";
    message?: string;
    phase: string;
    expected?: FulfillmentTime;
    shippedAt?: string;
    completedAt?: string;
    lines: { lineId: string; title: string; quantity: number }[];
  }[];
  events: {
    publicId: string;
    deliveryPublicId: string;
    kind: "delivery" | "progress";
    title: string;
    text?: string;
    status: "planned" | "completed" | "cancelled";
    scheduled: FulfillmentTime;
    occurredAt?: string;
  }[];
}
export interface TrackingPreview {
  workspaceRevision: number;
  publicationVersion: number;
  hash: string;
  snapshot: TrackingSnapshot;
}
export interface TrackingPublicationDetails {
  workspaceRevision: number;
  publicationVersion: number;
  state: OrderFulfillments["publication"]["state"];
  publishedAt: string | null;
  snapshot: TrackingSnapshot | null;
}
