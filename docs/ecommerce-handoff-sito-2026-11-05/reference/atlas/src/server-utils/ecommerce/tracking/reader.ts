import "server-only";
import type {
  PublicOrderTracking,
  PublicTrackingTimeline,
  PublicTrackingDeliveryDetails,
} from "@evolve/ecommerce-server/tracking";
import {
  withAtlasCommerceTransaction,
  type AtlasCommerceTransaction,
} from "../persistence/atlas-storage";
import { lockCheckoutPrincipal } from "../checkout/auth";
import {
  parsePrincipal,
  objectWithKeys,
  publicId,
  checkoutError,
} from "../checkout/validation";
import { CommerceServiceError } from "@evolve/ecommerce-server/identity";
import { publishedTracking } from "../fulfillments/publication";
import type { CheckoutProof } from "../checkout/service";
import {
  validatePublicOrderTracking,
  validatePublicTrackingTimeline,
  validatePublicTrackingDelivery,
} from "@evolve/ecommerce-server/tracking";
const PAGE_SIZE = 20;
const unavailable = (): never =>
  checkoutError(404, "TRACKING_NOT_FOUND", "Informazioni non disponibili.");
function decodeCursor(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length > 512 ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  )
    checkoutError(400, "INVALID_CURSOR", "Pagina timeline non valida.");
  try {
    const decoded = Buffer.from(value, "base64url");
    if (decoded.toString("base64url") !== value) throw new Error();
    const c = objectWithKeys(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decoded)),
      ["v", "order", "publication", "delivery", "after"],
    );
    if (
      c.v !== 1 ||
      !Number.isSafeInteger(c.publication) ||
      (c.publication as number) < 1 ||
      (c.delivery !== null && typeof c.delivery !== "string")
    )
      throw new Error();
    return {
      order: publicId(c.order),
      publication: c.publication as number,
      delivery: c.delivery === null ? null : publicId(c.delivery),
      after: publicId(c.after),
    };
  } catch {
    return checkoutError(400, "INVALID_CURSOR", "Pagina timeline non valida.");
  }
}
async function consumeReadLimit(
  tx: AtlasCommerceTransaction,
  accountId: string,
) {
  const now = new Date(),
    bucketAt = new Date(Math.floor(now.getTime() / 60000) * 60000),
    key = { shopId: tx.shopId, accountId, bucketAt };
  const found = await tx.internal.trackingRateLimits
    .findOne(key)
    .session(tx.session)
    .lean();
  if (found) {
    if (
      !Number.isSafeInteger(found.count) ||
      found.count < 1 ||
      found.count > 60
    )
      checkoutError(
        503,
        "TRACKING_UNAVAILABLE",
        "Tracking temporaneamente non disponibile.",
      );
    if (found.count >= 60)
      checkoutError(
        429,
        "TRACKING_RATE_LIMITED",
        "Troppe richieste di tracking. Riprova tra un minuto.",
      );
    const changed = await tx.internal.trackingRateLimits.updateOne(
      { ...key, count: found.count },
      { $inc: { count: 1 } },
      { session: tx.session },
    );
    if (changed.matchedCount !== 1)
      checkoutError(
        503,
        "TRACKING_UNAVAILABLE",
        "Tracking temporaneamente non disponibile.",
      );
  } else
    await new tx.internal.trackingRateLimits({
      ...key,
      count: 1,
      expiresAt: new Date(bucketAt.getTime() + 120000),
    }).save({ session: tx.session });
}
/** Every read fences both current customer access and the order against concurrent withdrawal/publication. */
export async function trackingForSite(
  proof: CheckoutProof,
  operation: "overview" | "timeline" | "delivery",
  orderId: string,
  requestId: string,
  deliveryId?: string,
): Promise<
  PublicOrderTracking | PublicTrackingTimeline | PublicTrackingDeliveryDetails
> {
  const principalInput = parsePrincipal(proof.body.principal),
    body = objectWithKeys(
      proof.body,
      operation === "timeline"
        ? ["principal", "cursor", "deliveryPublicId"]
        : ["principal"],
    );
  const filterId =
      operation === "delivery"
        ? publicId(deliveryId)
        : body.deliveryPublicId === undefined
          ? undefined
          : publicId(body.deliveryPublicId),
    cursor = body.cursor === undefined ? undefined : decodeCursor(body.cursor);
  const result = await withAtlasCommerceTransaction(
    { kind: "customer", id: principalInput.accountId, requestId },
    async (tx) => {
      const { principal } = await lockCheckoutPrincipal(tx, proof);
      try {
        await consumeReadLimit(tx, principal.accountId);
        const order = await tx.internal.orders
          .findOneAndUpdate(
            {
              shopId: tx.shopId,
              publicId: orderId,
              accountId: principal.accountId,
            },
            { $inc: { guard: 1 } },
            { new: true, session: tx.session },
          )
          .lean();
        if (!order) unavailable();
        const published = await publishedTracking(tx, order),
          snapshot = published.snapshot;
        if (!snapshot) {
          if (filterId) unavailable();
          return {
            value: validatePublicOrderTracking({
              orderPublicId: orderId,
              status: "not_available",
            }),
          };
        }
        const delivery = filterId
          ? snapshot.deliveries.find((d) => d.publicId === filterId)
          : undefined;
        if (filterId && !delivery) unavailable();
        const base = {
          orderPublicId: orderId,
          status: "available" as const,
          publicationVersion: published.publicationVersion,
          publishedAt: published.publishedAt!,
        };
        if (operation === "overview")
          return {
            value: validatePublicOrderTracking({
              ...base,
              phase: snapshot.phase,
              fulfillmentStatus: snapshot.fulfillmentStatus,
              deliveries: snapshot.deliveries,
              eventCount: snapshot.events.length,
            }),
          };
        const events = filterId
          ? snapshot.events.filter((e) => e.deliveryPublicId === filterId)
          : snapshot.events;
        if (operation === "delivery")
          return {
            value: validatePublicTrackingDelivery({
              ...base,
              delivery: delivery!,
              eventCount: events.length,
            }),
          };
        if (
          cursor &&
          (cursor.order !== orderId ||
            cursor.publication !== published.publicationVersion ||
            cursor.delivery !== (filterId || null))
        )
          checkoutError(
            409,
            "TRACKING_CHANGED",
            "La timeline è cambiata. Ricarica dalla prima pagina.",
          );
        const anchor = cursor
          ? events.findIndex((e) => e.publicId === cursor.after)
          : -1;
        if (cursor && anchor < 0)
          checkoutError(
            409,
            "TRACKING_CHANGED",
            "La timeline è cambiata. Ricarica dalla prima pagina.",
          );
        const page = events.slice(anchor + 1, anchor + 1 + PAGE_SIZE),
          hasMore = anchor + 1 + page.length < events.length;
        const nextCursor = hasMore
          ? Buffer.from(
              JSON.stringify({
                v: 1,
                order: orderId,
                publication: published.publicationVersion,
                delivery: filterId || null,
                after: page.at(-1)!.publicId,
              }),
            ).toString("base64url")
          : null;
        return {
          value: validatePublicTrackingTimeline({
            ...base,
            events: page,
            pageSize: PAGE_SIZE,
            nextCursor,
          }),
        };
      } catch (error) {
        // Commit the authenticated nonce and read budget even for missing resources/obsolete cursors.
        if (
          error instanceof CommerceServiceError &&
          [400, 404, 409, 429].includes(error.status)
        )
          return { error };
        throw error;
      }
    },
  );
  if (result.error) throw result.error;
  return result.value!;
}
