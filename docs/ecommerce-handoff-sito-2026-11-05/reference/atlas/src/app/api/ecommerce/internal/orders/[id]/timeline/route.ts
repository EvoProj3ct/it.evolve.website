import { internalTrackingHandler } from "@/server-utils/ecommerce/tracking/internal-handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const p = await params;
  return internalTrackingHandler(request, "timeline", p.id);
}
