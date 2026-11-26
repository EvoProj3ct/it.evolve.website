import { handleTracking } from "@/server/storefront-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { return handleTracking(request, "tracking", (await params).id); }

