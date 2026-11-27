import { commerceBoundary, query } from "@/server/ecommerce-http";
import { storefrontAuth } from "@/server/storefront-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const handle = (request: Request) => commerceBoundary(async () => {
  query(request);
  return storefrontAuth.handleBillingProfile(request);
});

export const GET = handle;
export const PUT = handle;
