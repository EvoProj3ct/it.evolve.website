import { storefrontCatalog } from "@/server/storefront-catalog";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) { return storefrontCatalog.productPage(request, (await params).slug); }

