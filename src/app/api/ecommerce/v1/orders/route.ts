import { handleCommerce } from "@/server/storefront-commerce";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function GET(request: Request) {
  return handleCommerce(request, "orders");
}

