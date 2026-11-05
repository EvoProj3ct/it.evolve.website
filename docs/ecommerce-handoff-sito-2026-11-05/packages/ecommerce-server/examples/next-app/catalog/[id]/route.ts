// Copy to app/api/ecommerce/v1/catalog/[id]/route.ts in the WEBSITE repository.
import { storefrontCatalogHandlersFromEnv } from "@evolve/ecommerce-server/catalog";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return storefrontCatalogHandlersFromEnv(process.env).product(
    request,
    (await context.params).id,
  );
}
