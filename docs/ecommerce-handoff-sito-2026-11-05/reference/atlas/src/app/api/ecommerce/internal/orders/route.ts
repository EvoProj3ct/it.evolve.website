import { internalOrdersHandler } from "@/server-utils/ecommerce/orders/internal-handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function POST(request: Request) {
  return internalOrdersHandler(request, "list");
}
