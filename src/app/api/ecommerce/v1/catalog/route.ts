import { storefrontCatalog } from "@/server/storefront-catalog";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const GET = (request: Request) => storefrontCatalog.catalog(request);

