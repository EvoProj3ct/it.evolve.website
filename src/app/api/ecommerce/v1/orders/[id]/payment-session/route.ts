import { handleCommerce } from "@/server/storefront-commerce";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Context) {
  return handleCommerce(request, "payment", (await params).id);
}

