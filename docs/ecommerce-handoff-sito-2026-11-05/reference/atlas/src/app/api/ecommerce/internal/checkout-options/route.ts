import { internalCheckoutHandler } from "@/server-utils/ecommerce/checkout/internal-handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return internalCheckoutHandler(request, "options");
}
