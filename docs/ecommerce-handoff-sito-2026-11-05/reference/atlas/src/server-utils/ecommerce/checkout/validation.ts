import "server-only";
import { randomUUID } from "node:crypto";
import {
  catalogError,
  objectWithKeys,
  integer,
  text,
  publicId,
  decimalMinor,
} from "../catalog/validation";
export { catalogError as checkoutError, objectWithKeys, integer, publicId };
export function plain(value: unknown, max: number, optional = false) {
  const result = text(value, max, optional);
  if (/[\u0000-\u001f\u007f]/.test(result))
    catalogError(400, "INVALID_INPUT", "Campi non validi.");
  return result;
}
export function objectId(value: unknown) {
  const result = plain(value, 24);
  if (!/^[a-f0-9]{24}$/.test(result))
    catalogError(400, "INVALID_INPUT", "Identità non valida.");
  return result;
}
export function parsePrincipal(value: unknown) {
  const input = objectWithKeys(value, [
    "accountId",
    "sessionId",
    "credentialVersion",
    "accessVersion",
  ]);
  return {
    accountId: objectId(input.accountId),
    sessionId: objectId(input.sessionId),
    credentialVersion: integer(input.credentialVersion),
    accessVersion: integer(input.accessVersion),
  };
}
const country = (value: unknown) => {
  const result = plain(value, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(result))
    catalogError(400, "INVALID_COUNTRY", "Codice Paese non valido.");
  return result;
};
function countries(value: unknown, empty = false) {
  if (!Array.isArray(value) || value.length > 30 || (!empty && !value.length))
    catalogError(400, "INVALID_COUNTRY", "Configura i Paesi ammessi.");
  const result = value.map(country);
  if (new Set(result).size !== result.length)
    catalogError(400, "INVALID_COUNTRY", "Paesi duplicati.");
  return result;
}
function email(value: unknown) {
  const result = plain(value, 254).toLowerCase();
  if (
    !/^[\x21-\x7e]+@[^\s@]+\.[^\s@]+$/.test(result) ||
    result.split("@").length !== 2
  )
    catalogError(400, "INVALID_EMAIL", "Indirizzo email non valido.");
  return result;
}
export function parseAddress(value: unknown) {
  const input = objectWithKeys(value, [
    "name",
    "line1",
    "line2",
    "city",
    "postalCode",
    "region",
    "country",
  ]);
  return {
    name: plain(input.name, 200),
    line1: plain(input.line1, 200),
    city: plain(input.city, 100),
    postalCode: plain(input.postalCode, 20),
    country: country(input.country),
    ...(input.line2 ? { line2: plain(input.line2, 200) } : {}),
    ...(input.region ? { region: plain(input.region, 100) } : {}),
  };
}
export function parseBilling(value: unknown) {
  const input = objectWithKeys(value, [
    "kind",
    "name",
    "email",
    "taxCode",
    "vatNumber",
    "recipientCode",
    "certifiedEmail",
    "address",
  ]);
  if (
    typeof input.kind !== "string" ||
    !["individual", "company"].includes(input.kind)
  )
    catalogError(400, "INVALID_INPUT", "Tipo di fatturazione non valido.");
  return {
    kind: input.kind as "individual" | "company",
    name: plain(input.name, 200),
    email: email(input.email),
    address: parseAddress(input.address),
    ...(input.taxCode ? { taxCode: plain(input.taxCode, 40) } : {}),
    ...(input.vatNumber ? { vatNumber: plain(input.vatNumber, 40) } : {}),
    ...(input.recipientCode
      ? { recipientCode: plain(input.recipientCode, 20) }
      : {}),
    ...(input.certifiedEmail
      ? { certifiedEmail: email(input.certifiedEmail) }
      : {}),
  };
}
export function parseCart(value: unknown) {
  const input = objectWithKeys(value, [
    "principal",
    "cartPublicId",
    "expectedRevision",
    "items",
  ]);
  if (!Array.isArray(input.items) || input.items.length > 98)
    catalogError(400, "CART_LIMIT", "Il carrello contiene troppe righe.");
  const items = input.items.map((value) => {
    const item = objectWithKeys(value, [
      "productPublicId",
      "listingRevision",
      "quantity",
    ]);
    return {
      productPublicId: publicId(item.productPublicId),
      listingRevision: integer(item.listingRevision),
      quantity: integer(item.quantity, 1000, 1),
    };
  });
  if (new Set(items.map((item) => item.productPublicId)).size !== items.length)
    catalogError(400, "INVALID_INPUT", "Prodotti duplicati nel carrello.");
  return {
    cartPublicId:
      input.cartPublicId === null ? null : publicId(input.cartPublicId),
    expectedRevision: integer(input.expectedRevision),
    items,
  };
}
export function parseQuote(value: unknown) {
  const input = objectWithKeys(value, [
    "principal",
    "cartPublicId",
    "cartRevision",
    "policyRevision",
    "termsVersion",
    "idempotencyKey",
    "billing",
    "shipping",
    "fulfillmentSelections",
  ]);
  if (
    !Array.isArray(input.fulfillmentSelections) ||
    !input.fulfillmentSelections.length ||
    input.fulfillmentSelections.length > 2
  )
    catalogError(
      400,
      "INVALID_DELIVERY",
      "Scegli le modalità di consegna/esecuzione.",
    );
  const selections = input.fulfillmentSelections.map((value) => {
    const entry = objectWithKeys(value, ["mode", "optionPublicId"]);
    if (
      typeof entry.mode !== "string" ||
      !["shipping", "pickup", "service"].includes(entry.mode)
    )
      catalogError(400, "INVALID_DELIVERY", "Modalità non valida.");
    return {
      mode: entry.mode as "shipping" | "pickup" | "service",
      optionPublicId: publicId(entry.optionPublicId),
    };
  });
  if (
    new Set(selections.map((item) => item.mode)).size !== selections.length ||
    (selections.some((item) => item.mode === "shipping") &&
      selections.some((item) => item.mode === "pickup"))
  )
    catalogError(
      400,
      "INVALID_DELIVERY",
      "Modalità duplicate o incompatibili.",
    );
  return {
    cartPublicId: publicId(input.cartPublicId),
    cartRevision: integer(input.cartRevision),
    policyRevision: integer(input.policyRevision),
    termsVersion: plain(input.termsVersion, 80),
    idempotencyKey: publicId(input.idempotencyKey),
    billing: parseBilling(input.billing),
    ...(input.shipping !== undefined
      ? { shipping: parseAddress(input.shipping) }
      : {}),
    fulfillmentSelections: selections.sort((a, b) =>
      a.mode.localeCompare(b.mode),
    ),
  };
}
export function parsePolicy(value: unknown) {
  const input = objectWithKeys(value, [
    "expectedRevision",
    "enabled",
    "termsVersion",
    "countries",
    "maxLines",
    "maxQuantity",
    "maxGross",
    "quoteTtlMinutes",
    "requireIndividualTaxCode",
    "requireCompanyVat",
    "mixedRevenueCategory",
    "mixedRevenueVariant",
    "options",
  ]);
  for (const key of [
    "enabled",
    "requireIndividualTaxCode",
    "requireCompanyVat",
  ])
    if (typeof input[key] !== "boolean")
      catalogError(
        400,
        "INVALID_INPUT",
        "Completa le impostazioni del riepilogo.",
      );
  if (!Array.isArray(input.options) || input.options.length > 20)
    catalogError(400, "INVALID_INPUT", "Troppe modalità di consegna.");
  const options = input.options.map((value) => {
    const option = objectWithKeys(value, [
      "publicId",
      "enabled",
      "mode",
      "label",
      "details",
      "countries",
      "amount",
      "taxMode",
      "taxRate",
      "revenueCategory",
      "revenueVariant",
    ]);
    if (
      typeof option.enabled !== "boolean" ||
      typeof option.mode !== "string" ||
      !["shipping", "pickup", "service"].includes(option.mode) ||
      typeof option.taxMode !== "string" ||
      !["inclusive", "exclusive"].includes(option.taxMode)
    )
      catalogError(
        400,
        "INVALID_INPUT",
        "Completa la modalità e il criterio IVA.",
      );
    const unitMinor = decimalMinor(option.amount),
      category = plain(option.revenueCategory || "", 100, true),
      variant = plain(option.revenueVariant || "", 100, true);
    if (
      unitMinor > 0 &&
      (![
        "stampa3d",
        "consulenza",
        "sviluppoSoftware",
        "atlas",
        "altro",
      ].includes(category) ||
        !variant)
    )
      catalogError(
        400,
        "INVALID_INPUT",
        "Configura categoria e variante ricavo per i costi di consegna.",
      );
    const details = text(option.details ?? "", 500, true);
    return {
      publicId:
        option.publicId === null ? randomUUID() : publicId(option.publicId),
      enabled: option.enabled as boolean,
      mode: option.mode as "shipping" | "pickup" | "service",
      label: plain(option.label, 200),
      ...(details ? { details } : {}),
      countries: countries(option.countries),
      price: {
        unitMinor,
        taxMode: option.taxMode as "inclusive" | "exclusive",
        taxRateBps: decimalMinor(option.taxRate, 10000),
        currency: "EUR",
      },
      ...(unitMinor > 0
        ? { revenueCategory: category, revenueVariant: variant }
        : {}),
    };
  });
  if (new Set(options.map((item) => item.publicId)).size !== options.length)
    catalogError(400, "INVALID_INPUT", "Modalità di consegna duplicate.");
  const mixedCategory = plain(input.mixedRevenueCategory ?? "", 100, true),
    mixedVariant = plain(input.mixedRevenueVariant ?? "", 100, true);
  if (
    (mixedCategory || mixedVariant) &&
    (!["stampa3d", "consulenza", "sviluppoSoftware", "atlas", "altro"].includes(
      mixedCategory,
    ) ||
      !mixedVariant)
  )
    catalogError(
      400,
      "INVALID_INPUT",
      "Completa categoria e variante ricavo per gli ordini misti.",
    );
  return {
    mixedRevenue: mixedCategory
      ? { category: mixedCategory, variant: mixedVariant }
      : undefined,
    expectedRevision:
      input.expectedRevision === null ? null : integer(input.expectedRevision),
    enabled: input.enabled as boolean,
    termsVersion: plain(input.termsVersion || "", 80, true),
    countries: countries(input.countries, true),
    maxLines: integer(input.maxLines, 98, 1),
    maxQuantity: integer(input.maxQuantity, 1000, 1),
    maxGrossMinor: decimalMinor(input.maxGross),
    quoteTtlSeconds: integer(input.quoteTtlMinutes, 30, 5) * 60,
    requireIndividualTaxCode: input.requireIndividualTaxCode as boolean,
    requireCompanyVat: input.requireCompanyVat as boolean,
    options,
  };
}
