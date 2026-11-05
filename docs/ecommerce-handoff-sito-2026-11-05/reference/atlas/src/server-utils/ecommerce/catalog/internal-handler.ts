import "server-only";
import {
  commerceErrorResponse,
  commerceJson,
  commerceRequestId,
} from "@evolve/ecommerce-server/identity";
import { parseCatalogQuery } from "@evolve/ecommerce-server/catalog";
import { requireCommerceInternalService } from "../internal-service";
import { readPublishedCatalog } from "./service";
import { catalogError, publicId } from "./validation";

export async function internalCatalogHandler(
  request: Request,
  kind: "list" | "product" | "page",
  value?: string,
) {
  const requestId = commerceRequestId();
  try {
    const principal = await requireCommerceInternalService(request);
    let query: { limit?: number; cursor?: string; id?: string; slug?: string };
    if (kind === "list") query = parseCatalogQuery(request.url);
    else {
      if ([...new URL(request.url).searchParams].length)
        catalogError(400, "INVALID_QUERY", "Parametri non ammessi.");
      if (kind === "product") query = { id: publicId(value) };
      else {
        if (
          typeof value !== "string" ||
          value.length > 160 ||
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
        )
          catalogError(400, "INVALID_SLUG", "Slug non valido.");
        query = { slug: value };
      }
    }
    const result = await readPublishedCatalog(principal, query, requestId);
    // Keep 404 outside the transaction: source invalidation/withdrawal must commit.
    if (!result)
      catalogError(404, "PRODUCT_NOT_FOUND", "Prodotto non disponibile.");
    return commerceJson(result, { requestId });
  } catch (error) {
    return commerceErrorResponse(error, requestId);
  }
}
