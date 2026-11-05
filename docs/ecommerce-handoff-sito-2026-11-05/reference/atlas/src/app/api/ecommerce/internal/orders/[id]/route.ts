import { internalOrdersHandler } from "@/server-utils/ecommerce/orders/internal-handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return internalOrdersHandler(request, "get", (await params).id);
}
