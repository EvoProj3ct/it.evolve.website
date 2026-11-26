import { storefrontCatalog } from "@/server/storefront-catalog";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { return storefrontCatalog.product(request, (await params).id); }

