// Copy to app/api/ecommerce/v1/catalog/route.ts in the WEBSITE repository.
import { storefrontCatalogHandlersFromEnv } from "@evolve/ecommerce-server/catalog";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return storefrontCatalogHandlersFromEnv(process.env).catalog(request);
}
