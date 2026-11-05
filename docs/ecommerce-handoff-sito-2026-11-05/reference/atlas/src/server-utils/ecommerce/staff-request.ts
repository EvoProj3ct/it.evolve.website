import "server-only";
import { catalogError } from "./catalog/validation";

export async function readCommerceStaffMutation(
  request: Request,
): Promise<unknown> {
  let origin: string;
  try {
    const configured = new URL(process.env.NEXTAUTH_URL || "");
    if (
      configured.username ||
      configured.password ||
      configured.search ||
      configured.hash ||
      !["https:", "http:"].includes(configured.protocol) ||
      (process.env.VERCEL_ENV && configured.protocol !== "https:")
    )
      throw new Error();
    origin = configured.origin;
  } catch {
    return catalogError(
      503,
      "STAFF_ORIGIN_NOT_CONFIGURED",
      "Origine Atlas non configurata.",
    );
  }
  if (
    request.headers.get("origin") !== origin ||
    request.headers.get("x-atlas-commerce") !== "1" ||
    (request.headers.has("sec-fetch-site") &&
      request.headers.get("sec-fetch-site") !== "same-origin")
  ) {
    catalogError(
      403,
      "STAFF_ORIGIN_REQUIRED",
      "Richiesta di modifica non consentita.",
    );
  }
  if (
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
      request.headers.get("content-type") || "",
    )
  )
    catalogError(415, "JSON_REQUIRED", "È richiesto un contenuto JSON.");
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > 65536))
    catalogError(
      413,
      "BODY_TOO_LARGE",
      "Scheda troppo grande: riduci testi o immagini.",
    );
  const reader = request.body?.getReader();
  if (!reader) catalogError(400, "INVALID_INPUT", "Richiesta vuota.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 65536) {
        await reader.cancel();
        catalogError(
          413,
          "BODY_TOO_LARGE",
          "Scheda troppo grande: riduci testi o immagini.",
        );
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
    return catalogError(400, "INVALID_JSON", "Contenuto JSON non valido.");
  }
}
