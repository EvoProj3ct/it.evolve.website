import "server-only";
import { getVercelOidcToken } from "@vercel/oidc";
import { z } from "zod";
import { cartCountSchema, cartSchema, checkoutOptionsSchema, orderGroupSchema, orderSchema, ordersSchema, paymentSchema, placeOrderSchema, placedOrderSchema, publicIdSchema, quoteInputSchema, quoteSchema, saveCartSchema, startPaymentSchema } from "@/lib/ecommerce/contracts";
import { storefrontAuth } from "./storefront-auth";
import { storefrontLegal } from "./storefront-legal";
import { commerceBoundary, commerceJson, CommerceServiceError, limitedJson, parseInput, query } from "./ecommerce-http";

const empty = z.object({}).strict();
const cursor = z.object({ cursor: publicIdSchema.optional(), group: orderGroupSchema.optional() }).strict();
const operations = {
  cart: { method: "GET", path: () => "/cart", input: empty, output: cartSchema },
  cartCount: { method: "GET", path: () => "/cart/count", input: empty, output: cartCountSchema },
  saveCart: { method: "PUT", path: () => "/cart/items", input: saveCartSchema, output: cartSchema },
  checkoutOptions: { method: "GET", path: () => "/checkout-options", input: empty, output: checkoutOptionsSchema },
  quote: { method: "POST", path: () => "/quotes", input: quoteInputSchema, output: quoteSchema },
  readQuote: { method: "GET", path: (id?: string) => `/quotes/${id}`, input: empty, output: quoteSchema },
  placeOrder: { method: "POST", path: () => "/orders/place", input: placeOrderSchema, output: placedOrderSchema },
  orders: { method: "GET", path: () => "/orders", input: cursor, output: ordersSchema },
  order: { method: "GET", path: (id?: string) => `/orders/${id}`, input: empty, output: orderSchema },
  payment: { method: "POST", path: (id?: string) => `/orders/${id}/payment-session`, input: startPaymentSchema, output: paymentSchema },
  paymentStatus: { method: "GET", path: (id?: string) => `/orders/${id}/payment-status`, input: empty, output: paymentSchema },
  verifyPayment: { method: "POST", path: (id?: string) => `/orders/${id}/payment-verify`, input: empty, output: paymentSchema },
} as const;
type Operation = keyof typeof operations;

const errors: Record<string, { status: number; message: string }> = {};
function allow(status: number, message: string, codes: string[]) { for (const code of codes) errors[code] = { status, message }; }
allow(400, "Controlla i dati e le modalità selezionate.", ["INVALID_INPUT", "INVALID_COUNTRY", "INVALID_EMAIL", "INVALID_DELIVERY", "BILLING_INVALID", "SHIPPING_INVALID", "DELIVERY_INCOMPATIBLE", "CART_LIMIT", "AMOUNT_LIMIT", "INVALID_CURSOR"]);
allow(400, "Controlla le scelte della personalizzazione e usa un logo semplice.", ["PERSONALIZATION_INVALID"]);
allow(400, "Inserisci il link di un video YouTube o di un brano Spotify.", ["TRACK_LINK_INVALID"]);
allow(400, "Il codice sconto non è disponibile per questo carrello.", ["DISCOUNT_INVALID"]);
allow(400, "L’importo non è supportato dal pagamento online.", ["PAYMENT_AMOUNT_INVALID", "ORDER_AMOUNT_INVALID"]);
allow(413, "La richiesta è troppo grande.", ["BODY_TOO_LARGE"]);
allow(401, "Accedi nuovamente per continuare.", ["CUSTOMER_AUTH_REQUIRED", "SESSION_INVALID"]);
allow(409, "Il carrello è cambiato. Rileggi e conferma le tue scelte.", ["CART_CHANGED", "CATALOG_CHANGED"]);
allow(409, "La personalizzazione non è più disponibile. Controlla il carrello.", ["PERSONALIZATION_CHANGED"]);
allow(409, "Le condizioni di consegna sono cambiate. Aggiorna il riepilogo.", ["POLICY_CHANGED", "DELIVERY_CHANGED"]);
allow(409, "Le condizioni di acquisto sono cambiate. Aggiorna il riepilogo.", ["TERMS_CHANGED"]);
allow(409, "Il riepilogo è scaduto o è cambiato. Preparane uno nuovo.", ["QUOTE_EXPIRED_OR_CHANGED"]);
allow(409, "Questa operazione richiede una verifica. Aggiorna i dati prima di continuare.", ["BILLING_REVIEW_REQUIRED", "CUSTOMER_REVIEW_REQUIRED", "ORDER_CHANGED", "ORDER_ALREADY_CREATED", "IDEMPOTENCY_CONFLICT", "REQUEST_REPLAY", "ORDER_NOT_PAYABLE", "PAYMENT_BUSY", "PAYMENT_REVIEW_REQUIRED"]);
allow(409, "Il profilo commerciale è cambiato. Aggiorna il checkout e prepara un nuovo riepilogo.", ["CUSTOMER_LINK_CHANGED"]);
allow(404, "La risorsa richiesta non è disponibile.", ["CART_NOT_FOUND", "QUOTE_NOT_FOUND", "ORDER_NOT_FOUND", "PRODUCT_NOT_FOUND"]);
allow(429, "Troppe richieste. Attendi prima di riprovare.", ["AUTH_RATE_LIMITED", "RATE_LIMITED"]);
allow(503, "Il negozio non ha ancora attivato i riepiloghi d’acquisto.", ["CHECKOUT_DISABLED"]);
allow(503, "Le modalità di consegna non sono ancora configurate.", ["CHECKOUT_INCOMPLETE"]);
allow(503, "La numerazione degli ordini è temporaneamente indisponibile.", ["ORDER_NUMBER_UNAVAILABLE"]);
allow(503, "Il negozio deve completare la configurazione per gli ordini con categorie di ricavo diverse.", ["REVENUE_MAPPING_REQUIRED"]);
allow(503, "Il servizio non è disponibile in questo momento. Riprova più tardi.", ["PAYMENTS_DISABLED", "PAYMENTS_NOT_CONFIGURED", "PAYMENT_UNAVAILABLE"]);
const upstreamError = z.object({ error: z.object({ code: z.string().max(100), message: z.string().max(2000), requestId: z.string().max(100) }).strict() }).strict();

function connection() {
  const origin = process.env.ECOMMERCE_ATLAS_ORIGIN;
  try {
    const url = new URL(origin || "");
    if (!origin || url.protocol !== "https:" || url.origin !== origin || url.username || url.password || process.env.ECOMMERCE_INTERNAL_AUDIENCE !== origin) throw new Error();
    const bypass = process.env.ECOMMERCE_ATLAS_PROTECTION_BYPASS;
    if (bypass && (bypass !== bypass.trim() || bypass.length > 2048 || /[\r\n]/.test(bypass))) throw new Error();
    return { origin, bypass };
  } catch { throw new CommerceServiceError(503, "SERVICE_NOT_CONFIGURED", "Il servizio non è ancora disponibile."); }
}

async function measureCommercePhase<T>(
  operation: Operation,
  phase: "customer_session" | "oidc" | "atlas_request",
  work: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();
  let response: Response | undefined;
  try {
    const result = await work();
    if (result instanceof Response) response = result;
    return result;
  } finally {
    const durationMs = Math.round(performance.now() - startedAt);
    if (durationMs >= 1000) {
      const requestId = response?.headers.get("x-request-id");
      console.info("storefront.ecommerce.request.slow", {
        operation, phase, durationMs,
        atlasStatus: response?.status,
        atlasRequestId: requestId && /^[a-f0-9-]{36}$/i.test(requestId) ? requestId : undefined,
      });
    }
  }
}

// Chiuso a operazioni nominate. Nessun URL, principal o header Atlas proviene dal browser.
export async function handleCommerce(request: Request, operation: Operation, rawId?: string): Promise<Response> {
  return commerceBoundary(async () => {
    const specification: { method: "GET" | "PUT" | "POST"; path: (id?: string) => string; input: z.ZodType; output: z.ZodType } = operations[operation];
    if (request.method !== specification.method) throw new CommerceServiceError(405, "METHOD_NOT_ALLOWED", "Metodo non consentito.");
    const id = ["readQuote", "order", "payment", "paymentStatus", "verifyPayment"].includes(operation) ? parseInput(publicIdSchema, rawId) : undefined;
    const parameters = query(request, operation === "orders" ? ["cursor", "group"] : []);
    const body = specification.method === "GET" ? parameters : await limitedJson(request, 32768);
    const parsed = specification.input.safeParse(body);
    if (!parsed.success) throw new CommerceServiceError(400, "INVALID_INPUT", "Controlla i dati della richiesta.");
    const input = parsed.data as Record<string, unknown>;
    if (operation === "placeOrder") {
      const legal = storefrontLegal();
      if (!legal.checkoutTermsPath || !legal.checkoutTermsVersion)
        throw new CommerceServiceError(503, "LEGAL_NOT_CONFIGURED", "Le condizioni di acquisto non sono ancora disponibili.");
      if (input.acceptedTermsVersion !== legal.checkoutTermsVersion)
        throw new CommerceServiceError(409, "TERMS_CHANGED", "Le condizioni di acquisto sono cambiate. Aggiorna il riepilogo.");
    }
    const { origin, bypass } = connection();
    const path = `/api/ecommerce/internal${specification.path(id)}`;
    const prepared = await measureCommercePhase(operation, "customer_session", () =>
      storefrontAuth.prepareCommerceRequest(request, path, input));
    let token: string;
    try { token = await measureCommercePhase(operation, "oidc", () => getVercelOidcToken({ audience: origin })); if (!token) throw new Error(); }
    catch { throw new CommerceServiceError(503, "SERVICE_IDENTITY_UNAVAILABLE", "Il collegamento al servizio non è disponibile."); }
    let response: Response;
    try {
      response = await measureCommercePhase(operation, "atlas_request", () =>
        fetch(new URL(path, origin), { method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(operation === "payment" || operation === "verifyPayment" ? 25000 : 15000), headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json", "X-Commerce-Assertion": prepared.assertion, ...(bypass ? { "x-vercel-protection-bypass": bypass } : {}) }, body: JSON.stringify(prepared.payload) }));
    } catch { throw new CommerceServiceError(503, "ATLAS_UNAVAILABLE", "Collegamento interrotto. L’esito dell’operazione potrebbe non essere ancora noto: aggiorna i dati prima di riprovare."); }
    const value = await limitedJson(response, 1048576);
    if (!response.ok) {
      const parsedError = upstreamError.safeParse(value);
      const code = parsedError.success ? parsedError.data.error.code : "ATLAS_UNAVAILABLE";
      const upstreamId = response.headers.get("x-request-id");
      const atlasRequestId = upstreamId && /^[a-f0-9-]{36}$/i.test(upstreamId) ? upstreamId : undefined;
      if (response.status >= 500) {
        console.warn("storefront.ecommerce.atlas_rejected", {
          operation,
          atlasStatus: response.status,
          atlasCode: /^[A-Z0-9_]+$/.test(code) ? code : undefined,
          atlasRequestId,
        });
      }
      const allowed = errors[code];
      if (!allowed || allowed.status !== response.status) {
        const message = operation === "placeOrder" && atlasRequestId
          ? `Non è stato possibile confermare l’ordine. Riferimento ${atlasRequestId}.`
          : "Il servizio non è disponibile in questo momento.";
        throw new CommerceServiceError(response.status >= 500 ? 503 : 502, "ATLAS_SERVICE_REJECTED", message);
      }
      const error = new CommerceServiceError(allowed.status, code, allowed.message) as CommerceServiceError & { retryAfter?: number };
      const retry = response.headers.get("retry-after");
      if (response.status === 429 && retry && /^\d{1,5}$/.test(retry)) error.retryAfter = Math.min(86400, Number(retry));
      throw error;
    }
    const checked = specification.output.safeParse(value);
    if (!checked.success) throw new CommerceServiceError(502, "ATLAS_RESPONSE_INVALID", "Il servizio ha restituito dati non validi.");
    const result = checked.data as unknown as Record<string, unknown>;
    const mismatch = (operation === "readQuote" || operation === "order") && result.id !== id
      || (operation === "payment" || operation === "paymentStatus" || operation === "verifyPayment") && result.orderPublicId !== id
      || operation === "verifyPayment" && result.checkoutUrl !== null
      || operation === "saveCart" && !input.guestImportId && input.cartPublicId !== null && result.id !== input.cartPublicId
      || operation === "quote" && (result.cartPublicId !== input.cartPublicId || result.cartRevision !== input.cartRevision || result.policyRevision !== input.policyRevision || result.termsVersion !== input.termsVersion
        || (result.discount as { code: string } | undefined)?.code !== (input.discountCode as string | undefined)?.toUpperCase());
    if (mismatch) throw new CommerceServiceError(502, "ATLAS_RESPONSE_INVALID", "Il servizio ha restituito dati non coerenti.");
    return commerceJson(checked.data);
  });
}
