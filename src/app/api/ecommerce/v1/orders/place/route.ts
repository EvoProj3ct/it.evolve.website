import { handleCommerce } from "@/server/storefront-commerce";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function POST(request: Request) {
  return handleCommerce(request, "placeOrder");
}

