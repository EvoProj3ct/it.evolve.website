"use client";

import type { z } from "zod";

export class StorefrontError extends Error {
  constructor(message: string, public readonly status = 0, public readonly code = "NETWORK_UNAVAILABLE", public readonly retryAfter = 0) { super(message); }
}
export function hidesPreviousData(error: unknown) {
  return error instanceof StorefrontError &&
    ([401, 403, 404, 410].includes(error.status) || error.code === "TRACKING_CHANGED");
}
const API = "/api/ecommerce/v1";
const SESSION_EVENT = "evolve:storefront-session";
let generation = 0;
export const storefrontSessionGeneration = () => generation;
let retryUntil = 0;
let mutationQueue: Promise<unknown> = Promise.resolve();
type SessionChange = "changed" | "invalid";
let sessionChannel: BroadcastChannel | undefined;

function notifySession(reason: SessionChange) {
  generation++;
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: reason }));
}

function getSessionChannel() {
  if (!sessionChannel && typeof BroadcastChannel !== "undefined") {
    sessionChannel = new BroadcastChannel(SESSION_EVENT);
    sessionChannel.onmessage = ({ data }) => {
      if (data === "changed" || data === "invalid") notifySession(data);
    };
  }
  return sessionChannel;
}

export function sessionChanged(reason: SessionChange = "changed") {
  notifySession(reason);
  getSessionChannel()?.postMessage(reason);
}
export function subscribeSession(callback: (reason: SessionChange) => void) {
  const local = (event: Event) => callback((event as CustomEvent<SessionChange>).detail);
  getSessionChannel();
  window.addEventListener(SESSION_EVENT, local);
  return () => { window.removeEventListener(SESSION_EVENT, local); };
}
async function readResponse(response: Response): Promise<unknown> {
  if (!response.headers.get("content-type")?.toLowerCase().startsWith("application/json")) { await response.body?.cancel(); throw new StorefrontError("Il servizio non è disponibile in questo momento.", 502, "RESPONSE_INVALID"); }
  const reader = response.body?.getReader();
  if (!reader) throw new StorefrontError("Risposta non disponibile.", 502, "RESPONSE_INVALID");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "", size = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 1048576) { await reader.cancel(); throw new Error(); } text += decoder.decode(value, { stream: true }); } return JSON.parse(text + decoder.decode()); }
  catch { throw new StorefrontError("Il servizio ha restituito dati non validi.", 502, "RESPONSE_INVALID"); }
  finally { reader.releaseLock(); }
}
async function perform(path: string, init: RequestInit, epoch: number): Promise<unknown> {
  if (!/^\/[a-z0-9/_?=&%.-]+$/i.test(path) || path.startsWith("//") || path.includes("..")) throw new StorefrontError("Percorso non consentito.");
  if (Date.now() < retryUntil) throw new StorefrontError("Attendi prima di riprovare.", 429, "RATE_LIMITED", Math.ceil((retryUntil - Date.now()) / 1000));
  if (epoch !== generation) throw new DOMException("Sessione cambiata.", "AbortError");
  let response: Response;
  try { response = await fetch(`${API}${path}`, { ...init, credentials: "same-origin", cache: "no-store", redirect: "error" }); }
  catch (error) { if (error instanceof DOMException && error.name === "AbortError") throw error; throw new StorefrontError("Connessione interrotta. Aggiorna i dati prima di ripetere l’operazione."); }
  const data = await readResponse(response);
  if (epoch !== generation) throw new DOMException("Sessione cambiata.", "AbortError");
  if (!response.ok) {
    const fault = data && typeof data === "object" && "error" in data ? data.error as Record<string, unknown> : {};
    const code = typeof fault?.code === "string" ? fault.code : "SERVICE_UNAVAILABLE";
    const wait = response.headers.get("retry-after");
    const seconds = wait && /^\d{1,5}$/.test(wait) ? Math.min(Number(wait), 86400) : response.status === 429 ? 60 : 0;
    if (seconds) retryUntil = Date.now() + seconds * 1000;
    if (code === "SESSION_INVALID" || code === "CUSTOMER_AUTH_REQUIRED") sessionChanged("invalid");
    throw new StorefrontError(typeof fault?.message === "string" ? fault.message.slice(0, 2000) : "Operazione non disponibile.", response.status, code, seconds);
  }
  return data;
}
export async function storefrontGet<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const result = schema.safeParse(await perform(path, { signal }, generation));
  if (!result.success) throw new StorefrontError("Il servizio ha restituito dati non validi.", 502, "RESPONSE_INVALID");
  return result.data;
}
export async function storefrontRead<T>(path: string, signal?: AbortSignal): Promise<T> {
  // Solo per DTO catalogo/tracking già verificati dai validatori del pacchetto sul server.
  return await perform(path, { signal }, generation) as T;
}
export function storefrontMutate<T>(path: string, method: "POST" | "PUT" | "PATCH", body: unknown, schema: z.ZodType<T>): Promise<T> {
  const epoch = generation;
  const task = mutationQueue.catch(() => undefined).then(async () => {
    const issued = await perform("/auth/csrf", {}, epoch);
    if (!issued || typeof issued !== "object" || !("csrfToken" in issued) || typeof issued.csrfToken !== "string") throw new StorefrontError("Ricarica la pagina prima di riprovare.");
    const value = await perform(path, { method, headers: { "Content-Type": "application/json", "X-Storefront-CSRF": issued.csrfToken }, body: JSON.stringify(body) }, epoch);
    const checked = schema.safeParse(value);
    if (!checked.success) throw new StorefrontError("Il servizio ha restituito dati non validi.", 502, "RESPONSE_INVALID");
    return checked.data;
  });
  // La coda globale conserva soltanto il completamento, mai l’ultimo DTO personale.
  mutationQueue = task.then(() => undefined, () => undefined);
  return task;
}
export function safeReturnTo(value: string | null | undefined, fallback = "/account") {
  if (!value || value.length > 250 || value.includes("\\") || /[\u0000-\u0020]/.test(value)) return fallback;
  return /^(?:\/carrello|\/checkout|\/shop\/(?:carrello|profilo|e-linker)|\/account(?:\/livelli|\/ordini(?:\/[A-Za-z0-9_-]{16,80})?)?|\/negozio(?:\/[a-z0-9-]+)?)$/.test(value) ? value : fallback;
}
export const loginHref = (next: string) => `/account/login?next=${encodeURIComponent(safeReturnTo(next))}`;
export function errorText(error: unknown) {
  return error instanceof StorefrontError ? `${error.message}${error.retryAfter ? ` Riprova tra ${error.retryAfter} secondi.` : ""}` : "Operazione non disponibile. Riprova più tardi.";
}
