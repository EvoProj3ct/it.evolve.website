import { handleTracking } from "@/server/storefront-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function GET(request: Request, { params }: { params: Promise<{ id: string; deliveryId: string }> }) { const ids = await params; return handleTracking(request, "delivery", ids.id, ids.deliveryId); }

