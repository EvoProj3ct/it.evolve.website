import { storefrontAuth } from "@/server/storefront-auth";
import { commerceBoundary, query } from "@/server/ecommerce-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const handle = (request: Request) => commerceBoundary(async () => { query(request); return storefrontAuth.handleProfile(request); });
export const GET = handle;
export const PATCH = handle;

