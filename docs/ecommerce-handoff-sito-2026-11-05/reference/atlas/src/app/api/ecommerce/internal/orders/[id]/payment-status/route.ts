import { internalPaymentsHandler } from "@/server-utils/ecommerce/payments/internal-handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return internalPaymentsHandler(request, "status", (await params).id);
}
