import { getVercelOidcToken } from "@vercel/oidc";
import { CommerceServiceError } from "./errors.js";
import {
  validatePublicCatalogProduct,
  validatePublicCatalogList,
  parseCatalogQuery,
} from "./catalog-contract.js";

// Private transport; only named operations are returned, never arbitrary paths.
export function createCatalogClient({
  origin,
  audience,
  timeoutMs,
  protectionBypassSecret,
}) {
  async function get(path, validate) {
    let token;
    try {
      token = await getVercelOidcToken({ audience });
    } catch {
      throw new CommerceServiceError(
        503,
        "SERVICE_IDENTITY_UNAVAILABLE",
        "Identità del sito non disponibile.",
      );
    }
    if (typeof token !== "string" || !token)
      throw new CommerceServiceError(
        503,
        "SERVICE_IDENTITY_UNAVAILABLE",
        "Identità del sito non disponibile.",
      );
    let response;
    try {
      response = await fetch(new URL(path, origin), {
        method: "GET",
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(protectionBypassSecret
            ? { "x-vercel-protection-bypass": protectionBypassSecret }
            : {}),
        },
      });
    } catch {
      throw new CommerceServiceError(
        503,
        "ATLAS_UNAVAILABLE",
        "Collegamento ad Atlas non disponibile.",
      );
    }
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 404)
        throw new CommerceServiceError(
          404,
          "PRODUCT_NOT_FOUND",
          "Prodotto non disponibile.",
        );
      throw new CommerceServiceError(
        response.status === 401 || response.status === 403 ? 502 : 503,
        "ATLAS_SERVICE_REJECTED",
        "Collegamento ad Atlas non autorizzato o non disponibile.",
      );
    }
    const length = response.headers.get("content-length");
    if (
      (length && (!/^\d+$/.test(length) || Number(length) > 524288)) ||
      !response.headers.get("content-type")?.startsWith("application/json")
    ) {
      await response.body?.cancel();
      throw new CommerceServiceError(
        502,
        "ATLAS_RESPONSE_INVALID",
        "Risposta Atlas non valida.",
      );
    }
    const reader = response.body?.getReader();
    if (!reader)
      throw new CommerceServiceError(
        502,
        "ATLAS_RESPONSE_INVALID",
        "Risposta Atlas non valida.",
      );
    const chunks = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 524288) {
          await reader.cancel();
          throw new CommerceServiceError(
            502,
            "ATLAS_RESPONSE_INVALID",
            "Risposta Atlas non valida.",
          );
        }
        chunks.push(value);
      }
    } catch (error) {
      if (error instanceof CommerceServiceError) throw error;
      throw new CommerceServiceError(
        503,
        "ATLAS_UNAVAILABLE",
        "Lettura Atlas non disponibile.",
      );
    } finally {
      reader.releaseLock();
    }
    try {
      return validate(
        JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(
            Buffer.concat(chunks),
          ),
        ),
      );
    } catch {
      throw new CommerceServiceError(
        502,
        "ATLAS_RESPONSE_INVALID",
        "Risposta Atlas non valida.",
      );
    }
  }
  return {
    catalog: async (options = {}) => {
      if (
        !options ||
        typeof options !== "object" ||
        Array.isArray(options) ||
        Object.keys(options).some((key) => !["limit", "cursor"].includes(key))
      )
        throw new CommerceServiceError(
          400,
          "INVALID_QUERY",
          "Parametri catalogo non validi.",
        );
      const url = new URL("/api/ecommerce/internal/catalog", origin);
      if (options.limit !== undefined)
        url.searchParams.set("limit", String(options.limit));
      if (options.cursor !== undefined)
        url.searchParams.set("cursor", String(options.cursor));
      parseCatalogQuery(url.href);
      return get(url.pathname + url.search, validatePublicCatalogList);
    },
    product: async (id) => {
      if (typeof id !== "string" || !/^[A-Za-z0-9_-]{16,80}$/.test(id))
        throw new CommerceServiceError(
          400,
          "INVALID_PRODUCT_ID",
          "Identificatore prodotto non valido.",
        );
      return get(
        `/api/ecommerce/internal/catalog/${id}`,
        validatePublicCatalogProduct,
      );
    },
    productPage: async (slug) => {
      if (
        typeof slug !== "string" ||
        slug.length > 160 ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
      )
        throw new CommerceServiceError(
          400,
          "INVALID_SLUG",
          "Indirizzo prodotto non valido.",
        );
      return get(`/api/ecommerce/internal/product-pages/${slug}`, (value) =>
        validatePublicCatalogProduct(value, true),
      );
    },
  };
}
