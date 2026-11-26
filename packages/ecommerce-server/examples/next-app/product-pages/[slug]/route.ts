// Copy to app/api/ecommerce/v1/product-pages/[slug]/route.ts in the WEBSITE repository.
import { storefrontCatalogHandlersFromEnv } from "@evolve/ecommerce-server/catalog";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  return storefrontCatalogHandlersFromEnv(process.env).productPage(
    request,
    (await context.params).slug,
  );
}
