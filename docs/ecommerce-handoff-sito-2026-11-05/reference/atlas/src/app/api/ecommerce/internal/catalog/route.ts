import { internalCatalogHandler } from "@/server-utils/ecommerce/catalog/internal-handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return internalCatalogHandler(request, "list");
}
