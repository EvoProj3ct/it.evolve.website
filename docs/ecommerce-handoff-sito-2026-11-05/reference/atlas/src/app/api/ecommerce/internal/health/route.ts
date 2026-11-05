import {
  commerceErrorResponse,
  commerceJson,
  commerceRequestId,
} from "@evolve/ecommerce-server/identity";
import { requireCommerceInternalService } from "@/server-utils/ecommerce/internal-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = commerceRequestId();
  try {
    await requireCommerceInternalService(request);
    return commerceJson(
      { service: "atlas-ecommerce-internal", status: "ok", version: 1 },
      { requestId },
    );
  } catch (error) {
    return commerceErrorResponse(error, requestId);
  }
}
