import { handleCommerce } from "@/server/storefront-commerce";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  return handleCommerce(request, "readQuote", (await params).id);
}

