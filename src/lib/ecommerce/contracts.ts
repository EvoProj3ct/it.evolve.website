import { z } from "zod";
import { linkerOfferKinds } from "@evolve/ecommerce-server/keyring-offers";
import { keyringHoleIds, keyringLetteringPattern, keyringShapes, keyringTextOrientations, keyringTextSizes } from "@evolve/ecommerce-server/keyring-design";
import { stripeCheckoutUrlIssue, stripeCheckoutUrlMaxLength } from "@evolve/ecommerce-server/stripe-checkout-url";

export const publicIdSchema = z.string().regex(/^[A-Za-z0-9_-]{16,80}$/);
const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const text = (max: number) => z.string().max(max).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value));
const date = z.string().datetime({ offset: true });
const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const inscriptionSchema = z.string().trim().min(1).max(80).refine(value => !/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(value));
const keyringLetteringSchema = z.object({
  orientation: z.enum(keyringTextOrientations),
  size: z.enum(keyringTextSizes),
  x: z.number().int().min(-100).max(100),
  y: z.number().int().min(-100).max(100),
}).strict();
const configurationDetailsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("e-disk"), secondaryColor: colorSchema }).strict(),
  z.object({
    kind: z.literal("e-disk-bundle"),
    secondaryColor: colorSchema,
    discs: z.array(z.object({ title: inscriptionSchema, color: colorSchema, dedication: inscriptionSchema.optional(), trackUrl: z.string().max(512).optional() }).strict()).length(3),
  }).strict(),
  z.object({
    kind: z.enum(linkerOfferKinds), secondaryColor: colorSchema, shape: z.enum(keyringShapes),
    hole: z.enum(keyringHoleIds).optional(),
    front: keyringLetteringSchema.optional(),
    back: keyringLetteringSchema.extend({ text: z.string().trim().min(1).max(18).regex(keyringLetteringPattern) }).optional(),
  }).strict(),
  z.object({ kind: z.literal("e-disk-disc"), dedication: inscriptionSchema.optional(), trackUrl: z.string().max(512).optional() }).strict(),
  z.object({ kind: z.literal("e-led"), secondaryColor: colorSchema, effect: z.enum(["flow", "steady", "breathe", "pulse"]), mode: z.enum(["text", "logo", "both"]), width: integer.min(60).max(180), brightness: integer.min(20).max(100), speedTenths: integer.min(5).max(15).optional() }).strict(),
]);
const personalizationSummarySchema = z.object({ color: colorSchema.optional(), inscription: inscriptionSchema.optional(), hasLogo: z.boolean(), details: configurationDetailsSchema.optional() }).strict();
export const personalizationInputSchema = z.object({
  color: colorSchema.optional(),
  inscription: inscriptionSchema.optional(),
  logo: z.string().min(4).max(16384).regex(/^[A-Za-z0-9+/]+={0,2}$/).optional(),
  details: configurationDetailsSchema.optional(),
}).strict().refine(value => !!(value.color || value.inscription || value.logo));
const discountCodeSchema = z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{2,31}$/);
const discountSchema = z.object({ code: discountCodeSchema, percent: integer.min(1).max(99), amountMinor: integer.min(1) }).strict();
export type PersonalizationSummary = z.infer<typeof personalizationSummarySchema>;
export const modeSchema = z.enum(["shipping", "pickup", "service"]);
export const totalsSchema = z.object({ netMinor: integer, taxMinor: integer, grossMinor: integer, currency: z.literal("EUR") }).strict().refine(value => value.netMinor + value.taxMinor === value.grossMinor);
export const priceSchema = z.object({ unitMinor: integer, taxMode: z.enum(["inclusive", "exclusive"]), taxRateBps: integer.max(10000), currency: z.literal("EUR") }).strict();
export const addressSchema = z.object({ name: text(200).min(1), line1: text(200).min(1), line2: text(200).optional(), city: text(100).min(1), postalCode: text(20).min(1), region: text(100).optional(), country: z.string().regex(/^[A-Z]{2}$/) }).strict();
export const billingSchema = z.object({ kind: z.enum(["individual", "company"]), name: text(200).min(1), email: z.string().email().max(254), taxCode: text(40).optional(), vatNumber: text(40).optional(), recipientCode: text(20).optional(), certifiedEmail: z.string().email().max(254).optional(), address: addressSchema }).strict();
const billingProfileSchema = billingSchema.omit({ kind: true, email: true });
export const savedBillingSchema = z.object({ billing: billingProfileSchema.nullable() }).strict();
export type BillingProfile = z.infer<typeof billingProfileSchema>;
export const cartItemSchema = z.object({ productPublicId: publicIdSchema, personalizationId: publicIdSchema.optional(), personalization: personalizationSummarySchema.optional(), listingRevision: integer.nullable(), currentListingRevision: integer.optional(), quantity: integer.min(1).max(1000), state: z.enum(["available", "changed", "unavailable", "limit_exceeded"]), title: text(200).optional(), code: text(100).optional(), kind: z.enum(["physical", "service"]).optional(), price: priceSchema.optional(), totals: totalsSchema.optional(), fulfillmentModes: z.array(modeSchema).max(3).optional() }).strict().refine(item => item.state === "unavailable" || (item.currentListingRevision !== undefined && item.title !== undefined && item.code !== undefined && item.kind !== undefined && item.price !== undefined && item.totals !== undefined && !!item.fulfillmentModes?.length && (!item.personalizationId || !!item.personalization)));
export function cartLineKey(item: { productPublicId: string; personalizationId?: string }) {
  return item.personalizationId ?? item.productPublicId;
}
export const cartSchema = z.object({ id: publicIdSchema.nullable(), revision: integer, status: z.enum(["empty", "active", "expired", "converted"]), items: z.array(cartItemSchema).max(100), previewTotals: totalsSchema.nullable(), requiresReview: z.boolean(), expiresAt: date.nullable(), convertedOrderPublicId: publicIdSchema.optional() }).strict().refine(cart => new Set(cart.items.map(cartLineKey)).size === cart.items.length).refine(cart => cart.status !== "empty" || (cart.id === null && cart.revision === 0 && cart.items.length === 0 && cart.expiresAt === null && cart.previewTotals === null));
export const cartCountSchema = z.object({ quantity: integer.max(100000) }).strict();
const saveCartItemSchema = z.object({
  productPublicId: publicIdSchema,
  listingRevision: integer,
  quantity: integer.min(1).max(1000),
  personalizationId: publicIdSchema.optional(),
  personalization: personalizationInputSchema.optional(),
}).strict().refine(item => !(item.personalizationId && item.personalization));
export const saveCartSchema = z.object({ cartPublicId: publicIdSchema.nullable(), expectedRevision: integer, items: z.array(saveCartItemSchema).max(98), guestImportId: publicIdSchema.optional() }).strict().refine(value => {
  if (value.guestImportId) return value.items.length === 1 && !value.items[0].personalizationId;
  const existing = value.items.filter(item => !item.personalization);
  return value.items.length - existing.length <= 1 && new Set(existing.map(cartLineKey)).size === existing.length;
});
export const checkoutOptionsSchema = z.object({ revision: integer, termsVersion: text(80).min(1), countries: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1).max(30), maxLines: integer.min(1).max(98), maxQuantity: integer.min(1).max(1000), maxGrossMinor: integer, quoteTtlSeconds: integer.min(1).max(1800), requireIndividualTaxCode: z.boolean(), requireCompanyVat: z.boolean(), options: z.array(z.object({ publicId: publicIdSchema, mode: modeSchema, label: text(200), details: text(500), countries: z.array(z.string().regex(/^[A-Z]{2}$/)).max(30), price: priceSchema, totals: totalsSchema }).strict()).max(20) }).strict();
const selectionInput = z.object({ mode: modeSchema, optionPublicId: publicIdSchema }).strict();
export const quoteInputSchema = z.object({ cartPublicId: publicIdSchema, cartRevision: integer, policyRevision: integer, termsVersion: text(80).min(1), idempotencyKey: publicIdSchema, billing: billingSchema, shipping: addressSchema.optional(), fulfillmentSelections: z.array(selectionInput).min(1).max(2), discountCode: discountCodeSchema.optional() }).strict().refine(value => new Set(value.fulfillmentSelections.map(item => item.mode)).size === value.fulfillmentSelections.length && !(value.fulfillmentSelections.some(item => item.mode === "shipping") && value.fulfillmentSelections.some(item => item.mode === "pickup"))).refine(value => value.fulfillmentSelections.some(item => item.mode === "shipping") === !!value.shipping);
const orderLineSchema = z.object({ lineId: publicIdSchema, productPublicId: publicIdSchema, listingRevision: integer, title: text(200), code: text(100), kind: z.enum(["physical", "service", "delivery"]), quantity: integer.min(1).max(1000), price: priceSchema, totals: totalsSchema, personalization: personalizationSummarySchema.optional() }).strict();
const selectionSchema = z.object({ optionPublicId: publicIdSchema, mode: modeSchema, label: text(200), details: text(500), price: priceSchema }).strict();
export const quoteSchema = z.object({ id: publicIdSchema, cartPublicId: publicIdSchema, cartRevision: integer, policyRevision: integer, termsVersion: text(80), createdAt: date, expiresAt: date, lines: z.array(orderLineSchema).min(1).max(100), totals: totalsSchema, discount: discountSchema.optional(), billing: billingSchema, shipping: addressSchema.optional(), fulfillmentSelections: z.array(selectionSchema).max(2) }).strict();
export const operationalStatusSchema = z.enum(["open", "in_progress", "on_hold", "completed", "cancelled"]);
export const paymentStatusSchema = z.enum(["awaiting", "processing", "paid", "refund_pending", "partially_refunded", "refunded", "failed", "expired", "disputed", "under_review"]);
export const fulfillmentStatusSchema = z.enum(["unfulfilled", "in_progress", "partial", "fulfilled", "cancelled"]);
const paymentSummary = z.object({ paidMinor: integer, refundedMinor: integer, paidAt: date.optional(), method: text(80).optional(), requiresReview: z.boolean() }).strict();
export const orderSummarySchema = z.object({ id: publicIdSchema, number: text(80), revision: integer, placedAt: date, operationalStatus: operationalStatusSchema, paymentStatus: paymentStatusSchema, fulfillmentStatus: fulfillmentStatusSchema, deliveryPhase: z.enum(["ready_for_pickup", "shipped", "delivered"]).optional(), deliveryMode: z.enum(["shipping", "pickup", "service"]).optional(), totals: totalsSchema, payment: paymentSummary.optional() }).strict();
export const orderSchema = orderSummarySchema.extend({ lines: z.array(orderLineSchema).min(1).max(100), discount: discountSchema.optional(), billing: billingSchema, shipping: addressSchema.optional(), fulfillmentSelections: z.array(selectionSchema).max(2), fulfillment: z.array(z.object({ lineId: publicIdSchema, state: z.enum(["unfulfilled", "preparing", "shipped", "delivered", "service_completed", "cancelled"]), fulfilledQuantity: integer.max(1000), shippedQuantity: integer.max(1000) }).strict()).max(100), termsVersion: text(80) }).strict();
export const orderGroupSchema = z.enum(["active", "received", "cancelled"]);
const orderProductMarkSchema = z.enum(["e-disk", "e-disk-bundle", "e-disk-disc", "e-led", ...linkerOfferKinds]);
const customerOrderListItemSchema = orderSummarySchema.extend({
  productCount: integer.max(100).optional(),
  products: z.array(z.object({
    title: text(200),
    mark: orderProductMarkSchema.optional(),
    color: colorSchema.optional(),
    secondaryColor: colorSchema.optional(),
  }).strict()).max(4).optional(),
});
export const ordersSchema = z.object({
  items: z.array(customerOrderListItemSchema).max(30),
  nextCursor: publicIdSchema.nullable(),
  stats: z.object({ active: integer, received: integer, cancelled: integer, paidMinor: integer, refundedMinor: integer }).strict(),
}).strict();
export const placeOrderSchema = z.object({
  quotePublicId: publicIdSchema,
  idempotencyKey: publicIdSchema,
  acceptedTermsVersion: text(80).min(1),
}).strict();
export const placedOrderSchema = z.object({ order: orderSchema, replayed: z.boolean() }).strict();
export const startPaymentSchema = z.object({ expectedRevision: integer, idempotencyKey: publicIdSchema }).strict();
export function isStripeCheckoutUrl(value: string): boolean {
  return stripeCheckoutUrlIssue(value) === null;
}
export const paymentSchema = z.object({ orderPublicId: publicIdSchema, orderRevision: integer, paymentStatus: paymentStatusSchema, attempt: z.object({ id: publicIdSchema, state: z.enum(["creating", "ready", "processing", "paid", "failed", "expired", "cancelled", "under_review"]), expiresAt: date.nullable() }).strict().nullable(), paidMinor: integer, refundedMinor: integer, checkoutUrl: z.string().max(stripeCheckoutUrlMaxLength).refine(isStripeCheckoutUrl).nullable() }).strict();
export const accountSchema = z.object({ id: publicIdSchema, email: z.string().email().max(254), name: text(200), kind: z.enum(["individual", "company"]), phone: text(40).optional(), emailVerified: z.literal(true) }).strict();
export const profileSchema = z.object({ account: accountSchema }).strict();
export const customerLinkSchema = z.object({ status: z.enum(["pending", "linked", "review_required", "blocked"]), checkoutReady: z.boolean(), message: text(1000) }).strict();
export type Cart = z.infer<typeof cartSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type SaveCart = z.infer<typeof saveCartSchema>;
export type PersonalizationInput = NonNullable<SaveCart["items"][number]["personalization"]>;
export type CheckoutOptions = z.infer<typeof checkoutOptionsSchema>;
export type QuoteInput = z.infer<typeof quoteInputSchema>;
export type Quote = z.infer<typeof quoteSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderSummary = z.infer<typeof orderSummarySchema>;
export type Orders = z.infer<typeof ordersSchema>;
export type CustomerOrderListItem = z.infer<typeof customerOrderListItemSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type Account = z.infer<typeof accountSchema>;
export type CustomerLink = z.infer<typeof customerLinkSchema>;
export type Address = z.infer<typeof addressSchema>;

export const statusLabels: Record<string, string> = {
  open: "Confermato", in_progress: "In lavorazione", on_hold: "In attesa", completed: "Completato", cancelled: "Annullato",
  awaiting: "Da pagare", processing: "Pagamento in elaborazione", paid: "Pagato", refund_pending: "Rimborso in corso", partially_refunded: "Rimborso parziale", refunded: "Rimborsato", failed: "Non riuscito", expired: "Scaduto", disputed: "Contestato", under_review: "In verifica",
  unfulfilled: "Da evadere", partial: "Evasione parziale", fulfilled: "Evaso", planned: "Programmato", preparing: "In preparazione", ready_for_pickup: "Pronto per il ritiro", shipped: "Spedito", delivered: "Consegnato", service_completed: "Servizio completato",
};
export const money = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
