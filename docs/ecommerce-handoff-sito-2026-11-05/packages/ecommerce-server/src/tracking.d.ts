export type PublicTrackingTime =
  | { kind: "date"; date: string; timeZone: "Europe/Rome" }
  | {
      kind: "instant";
      startsAt: string;
      timeZone: "Europe/Rome";
    }
  | {
      kind: "window";
      startsAt: string;
      endsAt: string;
      timeZone: "Europe/Rome";
    };
export interface PublicTrackingDelivery {
  publicId: string;
  label: string;
  mode: "shipping" | "pickup" | "service";
  phase:
    | "planned"
    | "preparing"
    | "shipped"
    | "delivered"
    | "service_completed"
    | "cancelled";
  message?: string;
  expected?: PublicTrackingTime;
  shippedAt?: string;
  completedAt?: string;
  lines: { lineId: string; title: string; quantity: number }[];
}
export interface PublicTrackingEvent {
  publicId: string;
  deliveryPublicId: string;
  kind: "delivery" | "progress";
  title: string;
  text?: string;
  status: "planned" | "completed" | "cancelled";
  scheduled: PublicTrackingTime;
  occurredAt?: string;
}
export interface TrackingUnavailable {
  orderPublicId: string;
  status: "not_available";
}
export interface TrackingAvailable {
  orderPublicId: string;
  status: "available";
  publicationVersion: number;
  publishedAt: string;
}
export type PublicOrderTracking =
  | TrackingUnavailable
  | (TrackingAvailable & {
      phase: "open" | "in_progress" | "on_hold" | "completed" | "cancelled";
      fulfillmentStatus:
        | "unfulfilled"
        | "in_progress"
        | "partial"
        | "fulfilled"
        | "cancelled";
      deliveries: PublicTrackingDelivery[];
      eventCount: number;
    });
export type PublicTrackingTimeline =
  | TrackingUnavailable
  | (TrackingAvailable & {
      events: PublicTrackingEvent[];
      pageSize: 20;
      nextCursor: string | null;
    });
export type PublicTrackingDeliveryDetails = TrackingAvailable & {
  delivery: PublicTrackingDelivery;
  eventCount: number;
};
export interface TrackingPreparedRequest {
  payload: Record<string, unknown>;
  assertion: string;
}
export function validatePublicOrderTracking(
  value: unknown,
): PublicOrderTracking;
export function validatePublicTrackingTimeline(
  value: unknown,
): PublicTrackingTimeline;
export function validatePublicTrackingDelivery(
  value: unknown,
): PublicTrackingDeliveryDetails;
/** Named server calls only; prepare a new session assertion for each HTTP attempt. */
export function createTrackingClient(options: {
  auth: {
    prepareCommerceRequest(
      request: Request,
      path: string,
      input?: Record<string, unknown>,
    ): Promise<TrackingPreparedRequest>;
  };
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
}): Readonly<{
  tracking(request: Request, orderId: string): Promise<PublicOrderTracking>;
  timeline(
    request: Request,
    orderId: string,
    options?: { cursor?: string; deliveryPublicId?: string },
  ): Promise<PublicTrackingTimeline>;
  delivery(
    request: Request,
    orderId: string,
    deliveryId: string,
  ): Promise<PublicTrackingDeliveryDetails>;
}>;
