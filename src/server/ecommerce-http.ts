import "server-only";
import { CommerceServiceError, commerceErrorResponse, commerceJson } from "@evolve/ecommerce-server";
import type { z } from "zod";

export { CommerceServiceError, commerceJson };
export async function limitedJson(source: Request | Response, maximum: number): Promise<unknown> {
  const upstream = source instanceof Response;
  const invalid = () => new CommerceServiceError(upstream ? 502 : 400, upstream ? "ATLAS_RESPONSE_INVALID" : "INVALID_INPUT", upstream ? "Il servizio ha restituito una risposta non valida." : "Contenuto JSON non valido.");
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(source.headers.get("content-type") || "")) { await source.body?.cancel(); throw invalid(); }
  const length = source.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maximum)) { await source.body?.cancel(); throw new CommerceServiceError(upstream ? 502 : 413, upstream ? "ATLAS_RESPONSE_INVALID" : "BODY_TOO_LARGE", "Contenuto troppo grande."); }
  const reader = source.body?.getReader();
  if (!reader) throw invalid();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw invalid(); }
      chunks.push(value);
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
  } catch (error) { if (error instanceof CommerceServiceError) throw error; throw invalid(); }
  finally { reader.releaseLock(); }
}
export function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new CommerceServiceError(400, "INVALID_INPUT", "Controlla i dati della richiesta.");
  return parsed.data;
}
export function query(request: Request, allowed: readonly string[] = []) {
  const result: Record<string, string> = {};
  for (const [key, value] of new URL(request.url).searchParams) {
    if (!allowed.includes(key) || key in result || !value) throw new CommerceServiceError(400, "INVALID_QUERY", "Parametri non ammessi.");
    result[key] = value;
  }
  return result;
}
export async function commerceBoundary(operation: () => Promise<Response>): Promise<Response> {
  try { return await operation(); }
  catch (error) {
    const response = commerceErrorResponse(error);
    if (error instanceof CommerceServiceError) {
      const wait = (error as CommerceServiceError & { retryAfter?: number }).retryAfter;
      if (Number.isSafeInteger(wait) && wait! > 0 && wait! <= 86400) response.headers.set("Retry-After", String(wait));
      if (error.code === "SESSION_INVALID") {
        response.headers.append("Set-Cookie", "__Host-storefront_session=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax");
        response.headers.append("Set-Cookie", "__Host-storefront_csrf=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict");
      }
    }
    return response;
  }
}
