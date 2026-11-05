import "server-only";
import {
  commerceErrorResponse,
  commerceJson,
  commerceRequestId,
} from "@evolve/ecommerce-server/identity";
import { requireCommerceStaffApi } from "../staff-auth";
import { readCommerceStaffMutation } from "../staff-request";
import {
  catalogError,
  integer,
  objectWithKeys,
  parseDraft,
  publicId,
  sourceHash,
  text,
} from "./validation";
import {
  createListing,
  getStaffListing,
  listCatalogSources,
  listStaffCatalog,
  previewCatalogDraft,
  publishCatalogListing,
  saveCatalogDraft,
  withdrawCatalogListing,
} from "./service";

type Operation =
  | "list"
  | "sources"
  | "get"
  | "create"
  | "save"
  | "preview"
  | "publish"
  | "withdraw";
function query(request: Request, keys: string[]) {
  const params = new URL(request.url).searchParams;
  if (
    [...params.keys()].some(
      (key) => !keys.includes(key) || params.getAll(key).length !== 1,
    )
  )
    catalogError(400, "INVALID_QUERY", "Parametri non validi.");
  return params;
}
export async function staffCatalogHandler(
  request: Request,
  operation: Operation,
  id?: string,
) {
  const requestId = commerceRequestId();
  try {
    const capability =
      operation === "publish" || operation === "withdraw"
        ? "ecommerce.catalog.publish"
        : ["create", "save", "preview", "sources"].includes(operation)
          ? "ecommerce.catalog.edit"
          : "ecommerce.catalog.view";
    const staff = await requireCommerceStaffApi(capability);
    if (operation === "list") {
      const params = query(request, ["cursor"]);
      const cursor = params.get("cursor");
      return commerceJson(
        await listStaffCatalog(
          staff,
          cursor ? publicId(cursor) : undefined,
          requestId,
        ),
        { requestId },
      );
    }
    if (operation === "sources") {
      const params = query(request, ["q", "cursor"]),
        cursor = params.get("cursor");
      if (cursor && !/^[a-f0-9]{24}$/.test(cursor))
        catalogError(400, "INVALID_QUERY", "Cursore non valido.");
      return commerceJson(
        await listCatalogSources(
          staff,
          text(params.get("q") || "", 100, true),
          cursor || undefined,
          requestId,
        ),
        { requestId },
      );
    }
    query(request, []);
    if (operation === "get")
      return commerceJson(
        await getStaffListing(staff, publicId(id), requestId),
        { requestId },
      );
    const value = await readCommerceStaffMutation(request);
    if (operation === "create") {
      const body = objectWithKeys(value, ["productId"]);
      const productId = text(body.productId, 24);
      if (!/^[a-f0-9]{24}$/.test(productId))
        catalogError(400, "INVALID_INPUT", "Articolo non valido.");
      return commerceJson(await createListing(staff, productId, requestId), {
        requestId,
      });
    }
    const body = objectWithKeys(
      value,
      operation === "withdraw"
        ? ["expectedVersion"]
        : [
            "expectedVersion",
            "expectedSourceHash",
            ...(operation === "save"
              ? ["draft"]
              : operation === "publish"
                ? ["mediaApproved"]
                : []),
          ],
    );
    const version = integer(body.expectedVersion),
      listingId = publicId(id);
    if (operation === "withdraw")
      return commerceJson(
        await withdrawCatalogListing(staff, listingId, version, requestId),
        { requestId },
      );
    const hash = sourceHash(body.expectedSourceHash);
    if (operation === "save")
      return commerceJson(
        await saveCatalogDraft(
          staff,
          listingId,
          version,
          hash,
          parseDraft(body.draft),
          requestId,
        ),
        { requestId },
      );
    if (operation === "preview")
      return commerceJson(
        await previewCatalogDraft(staff, listingId, version, hash, requestId),
        { requestId },
      );
    if (typeof body.mediaApproved !== "boolean")
      catalogError(400, "INVALID_INPUT", "Conferma immagini non valida.");
    return commerceJson(
      await publishCatalogListing(
        staff,
        listingId,
        version,
        hash,
        body.mediaApproved,
        requestId,
      ),
      { requestId },
    );
  } catch (error) {
    return commerceErrorResponse(error, requestId);
  }
}
