if (typeof window !== "undefined") throw new Error("ECOMMERCE_SERVER_ONLY");
import {
  commerceErrorResponse,
  commerceJson,
  commerceRequestId,
} from "./http.js";
import { CommerceServiceError } from "./errors.js";
import {
  parseCatalogQuery,
  validatePublicCatalogList,
  validatePublicCatalogProduct,
} from "./catalog-contract.js";
import { atlasCommerceClientFromEnv } from "./client.js";
export {
  validatePublicCatalogProduct,
  validatePublicCatalogList,
  publicProductFromViews,
  parseCatalogQuery,
} from "./catalog-contract.js";

/** Fixed, read-only public handlers for the WEBSITE backend. No Atlas UI/session or DB credential is imported. */
export function createStorefrontCatalogHandlers(client) {
  async function respond(work) {
    const requestId = commerceRequestId();
    try {
      return commerceJson(await work(), { requestId });
    } catch (error) {
      return commerceErrorResponse(error, requestId);
    }
  }
  function noQuery(request) {
    if ([...new URL(request.url).searchParams].length)
      throw new CommerceServiceError(
        400,
        "INVALID_QUERY",
        "Parametri non ammessi.",
      );
  }
  return Object.freeze({
    catalog: (request) =>
      respond(async () =>
        validatePublicCatalogList(
          await client.catalog(parseCatalogQuery(request.url)),
        ),
      ),
    product: (request, id) =>
      respond(async () => {
        noQuery(request);
        return validatePublicCatalogProduct(await client.product(id));
      }),
    productPage: (request, slug) =>
      respond(async () => {
        noQuery(request);
        return validatePublicCatalogProduct(
          await client.productPage(slug),
          true,
        );
      }),
  });
}

/** Delays env validation until inside the sanitized response boundary, rather than at build/import time. */
export function storefrontCatalogHandlersFromEnv(env) {
  return createStorefrontCatalogHandlers({
    catalog: (options) => atlasCommerceClientFromEnv(env).catalog(options),
    product: (id) => atlasCommerceClientFromEnv(env).product(id),
    productPage: (slug) => atlasCommerceClientFromEnv(env).productPage(slug),
  });
}
