import "server-only";
import {
  commerceJson,
  commerceErrorResponse,
  commerceRequestId,
} from "@evolve/ecommerce-server/identity";
import { requireCommerceInternalService } from "../internal-service";
import {
  integer,
  objectWithKeys,
  text,
  catalogError,
} from "../catalog/validation";
import { customerLinkForSite, reconcileCustomerIdentities } from "./service";

async function body(request: Request) {
  if (
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
      request.headers.get("content-type") || "",
    )
  )
    catalogError(415, "JSON_REQUIRED", "Contenuto JSON richiesto.");
  const reader = request.body?.getReader();
  if (!reader) catalogError(400, "INVALID_INPUT", "Richiesta non valida.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) {
        await reader.cancel();
        catalogError(413, "BODY_TOO_LARGE", "Richiesta troppo grande.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
    );
  } catch {
    return catalogError(400, "INVALID_INPUT", "JSON non valido.");
  }
}
export async function internalCustomerLinkHandler(
  request: Request,
  worker = false,
) {
  const requestId = commerceRequestId();
  try {
    const service = await requireCommerceInternalService(request);
    if (service.shopId !== process.env.ECOMMERCE_SHOP_ID)
      catalogError(403, "SHOP_MISMATCH", "Servizio non consentito.");
    if (new URL(request.url).search)
      catalogError(400, "INVALID_QUERY", "Parametri non ammessi.");
    if (worker) {
      objectWithKeys(await body(request), []);
      return commerceJson(await reconcileCustomerIdentities(requestId), {
        requestId,
      });
    }
    const input = objectWithKeys(await body(request), [
        "accountId",
        "accessVersion",
      ]),
      accountId = text(input.accountId, 24),
      accessVersion = integer(input.accessVersion);
    if (!/^[a-f0-9]{24}$/.test(accountId))
      catalogError(400, "INVALID_INPUT", "Identità non valida.");
    const operation = request.headers.get("x-commerce-link-operation");
    if (operation !== "read" && operation !== "resolve")
      catalogError(400, "INVALID_OPERATION", "Operazione non ammessa.");
    // Both named operations are POST on the service channel; the browser GET maps to an explicit read.
    return commerceJson(
      await customerLinkForSite(
        { accountId, accessVersion },
        requestId,
        request.headers.get("x-commerce-link-operation") === "resolve",
      ),
      { requestId },
    );
  } catch (error) {
    return commerceErrorResponse(error, requestId);
  }
}
