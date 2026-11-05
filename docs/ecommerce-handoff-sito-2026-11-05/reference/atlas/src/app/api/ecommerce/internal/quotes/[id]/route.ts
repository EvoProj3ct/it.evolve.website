import { internalCheckoutHandler } from "@/server-utils/ecommerce/checkout/internal-handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return internalCheckoutHandler(request, "read-quote", (await params).id);
}
