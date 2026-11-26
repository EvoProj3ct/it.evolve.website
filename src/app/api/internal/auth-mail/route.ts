import { storefrontAuth } from "@/server/storefront-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const POST = (request: Request) => storefrontAuth.handleMailDelivery(request);

