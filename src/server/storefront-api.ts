import "server-only";
import { storefrontAuth } from "./storefront-auth";
import { storefrontLegal } from "./storefront-legal";
import { trackingClient } from "./storefront-tracking";
import { commerceBoundary, CommerceServiceError, commerceJson, parseInput, query } from "./ecommerce-http";
import { publicIdSchema } from "@/lib/ecommerce/contracts";

export function handleStorefrontAuth(request: Request, action: string) {
  return commerceBoundary(async () => {
    query(request);
    if (request.method === "POST" && action === "register" && !storefrontLegal().registrationReady) throw new CommerceServiceError(503, "REGISTRATION_NOT_READY", "La registrazione non è ancora disponibile. Riprova più tardi.");
    return storefrontAuth.handleAuth(request, action);
  });
}
export function handleTracking(request: Request, kind: "tracking" | "timeline" | "delivery", orderId: string, deliveryId?: string) {
  return commerceBoundary(async () => {
    if (request.method !== "GET") throw new CommerceServiceError(405, "METHOD_NOT_ALLOWED", "Metodo non consentito.");
    const id = parseInput(publicIdSchema, orderId);
    const parameters = query(request, kind === "timeline" ? ["cursor", "deliveryPublicId"] : []);
    const client = trackingClient();
    const result = kind === "tracking" ? await client.tracking(request, id)
      : kind === "timeline" ? await client.timeline(request, id, parameters)
      : await client.delivery(request, id, parseInput(publicIdSchema, deliveryId));
    return commerceJson(result);
  });
}
