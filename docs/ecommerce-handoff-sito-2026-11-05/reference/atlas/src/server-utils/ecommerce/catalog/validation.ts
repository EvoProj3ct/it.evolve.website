import "server-only";
import { createHash } from "node:crypto";
import { CommerceServiceError } from "@evolve/ecommerce-server/identity";
import {
  COMMERCE_LIMITS,
  stableJson,
} from "@evolve/ecommerce-server/persistence";
import type { CatalogDraftInput, CatalogSource } from "./types";

export function catalogError(
  status: number,
  code: string,
  message: string,
): never {
  throw new CommerceServiceError(status, code, message);
}
export function objectWithKeys(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key))
  ) {
    catalogError(400, "INVALID_INPUT", "Campi della richiesta non validi.");
  }
  return value as Record<string, unknown>;
}
export function text(value: unknown, max: number, allowEmpty = false): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!allowEmpty && !value.trim()) ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    catalogError(
      400,
      "INVALID_INPUT",
      "Completa correttamente i campi della scheda.",
    );
  return value.trim();
}
export function integer(
  value: unknown,
  max = Number.MAX_SAFE_INTEGER,
  min = 0,
): number {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < min ||
    (value as number) > max
  )
    catalogError(400, "INVALID_INPUT", "Valore numerico non valido.");
  return value as number;
}
export function publicId(value: unknown): string {
  const id = text(value, 80);
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(id))
    catalogError(400, "INVALID_INPUT", "Identificatore non valido.");
  return id;
}
export function sourceHash(value: unknown): string {
  const hash = text(value, 64);
  if (!/^[a-f0-9]{64}$/.test(hash))
    catalogError(400, "INVALID_INPUT", "Revisione sorgente non valida.");
  return hash;
}
export function decimalMinor(
  value: unknown,
  max = COMMERCE_LIMITS.moneyMinor,
): number {
  const amount = text(value, 20);
  if (!/^\d{1,13}(?:[.,]\d{1,2})?$/.test(amount))
    catalogError(
      400,
      "INVALID_PRICE",
      "Usa un importo positivo con al massimo due decimali.",
    );
  const [whole, fraction = ""] = amount.replace(",", ".").split(".");
  const minor = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (minor > BigInt(max))
    catalogError(
      400,
      "INVALID_PRICE",
      "Importo superiore al limite consentito.",
    );
  return Number(minor);
}
export function minorText(value: number): string {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}
export function sourceFromRecord(record: any): CatalogSource {
  const data = record.data || {};
  const fields = {
    id: String(record._id),
    name: typeof data.nomeArticolo === "string" ? data.nomeArticolo : "",
    code: typeof data.codiceArticolo === "string" ? data.codiceArticolo : "",
    price:
      typeof data.prezzoUnitario === "number" &&
      Number.isFinite(data.prezzoUnitario)
        ? data.prezzoUnitario
        : null,
    kind: typeof data.genereArticolo === "string" ? data.genereArticolo : "",
  };
  let sourcePrice: string | null = null;
  if (
    fields.price !== null &&
    fields.price >= 0 &&
    /^\d+(?:\.\d{1,2})?$/.test(String(fields.price))
  ) {
    const [whole, fraction = ""] = String(fields.price).split(".");
    const minor = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
    if (minor <= BigInt(COMMERCE_LIMITS.moneyMinor))
      sourcePrice = minorText(Number(minor));
  }
  return {
    id: fields.id,
    name: fields.name,
    code: fields.code,
    kind:
      fields.kind === "servizio"
        ? "service"
        : fields.kind === "articolo fisico"
          ? "physical"
          : null,
    sourcePrice,
    hash: createHash("sha256").update(stableJson(fields)).digest("hex"),
  };
}
export function approvedMediaUrl(value: unknown): string {
  const candidate = text(value, 2048);
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return catalogError(400, "MEDIA_NOT_ALLOWED", "URL immagine non valido.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    /%|\\/.test(url.pathname)
  ) {
    catalogError(
      400,
      "MEDIA_NOT_ALLOWED",
      "Usa un URL pubblico HTTPS, senza parametri, da una cartella immagini autorizzata.",
    );
  }
  if (
    !url.hostname.includes(".") ||
    /^\d+(?:\.\d+){3}$/.test(url.hostname) ||
    url.hostname.includes(":") ||
    /\.(?:localhost|local|internal)$/.test(url.hostname)
  )
    catalogError(
      400,
      "MEDIA_NOT_ALLOWED",
      "Usa un dominio pubblico autorizzato per le immagini.",
    );
  const bases = (process.env.ECOMMERCE_PUBLIC_MEDIA_BASE_URLS || "")
    .split(",")
    .map((base) => base.trim())
    .filter(Boolean);
  const allowed = bases.some((base) => {
    try {
      const parsed = new URL(base);
      return (
        parsed.protocol === "https:" &&
        !parsed.username &&
        !parsed.password &&
        !parsed.search &&
        !parsed.hash &&
        parsed.pathname.endsWith("/") &&
        parsed.pathname !== "/" &&
        parsed.origin === url.origin &&
        url.pathname.startsWith(parsed.pathname)
      );
    } catch {
      return false;
    }
  });
  if (!allowed)
    catalogError(
      400,
      "MEDIA_NOT_ALLOWED",
      "La cartella di questa immagine non è autorizzata per il catalogo pubblico.",
    );
  return url.href;
}
export function parseDraft(value: unknown): CatalogDraftInput {
  const raw = objectWithKeys(value, [
    "slug",
    "title",
    "summary",
    "sections",
    "media",
    "priceSource",
    "onlinePrice",
    "taxMode",
    "taxRate",
    "fulfillmentModes",
    "revenueCategory",
    "revenueVariant",
  ]);
  const slug = text(raw.slug, 160);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    catalogError(
      400,
      "INVALID_SLUG",
      "Usa lettere minuscole, numeri e trattini per lo slug.",
    );
  if (
    typeof raw.priceSource !== "string" ||
    !["source", "online_override"].includes(raw.priceSource) ||
    typeof raw.taxMode !== "string" ||
    !["inclusive", "exclusive"].includes(raw.taxMode)
  )
    catalogError(
      400,
      "INVALID_PRICE",
      "Scegli origine del prezzo e criterio IVA.",
    );
  const taxRate = text(raw.taxRate, 10);
  decimalMinor(taxRate, 10000);
  const onlinePrice = text(raw.onlinePrice, 20, true);
  if (raw.priceSource === "online_override") decimalMinor(onlinePrice);
  if (
    !Array.isArray(raw.sections) ||
    raw.sections.length > 20 ||
    !Array.isArray(raw.media) ||
    raw.media.length > 20 ||
    !Array.isArray(raw.fulfillmentModes) ||
    raw.fulfillmentModes.length < 1 ||
    raw.fulfillmentModes.length > 3 ||
    raw.fulfillmentModes.some(
      (mode) => !["shipping", "pickup", "service"].includes(mode),
    ) ||
    new Set(raw.fulfillmentModes).size !== raw.fulfillmentModes.length
  )
    catalogError(
      400,
      "INVALID_INPUT",
      "Contenuti o modalità di evasione non validi.",
    );
  const sections = raw.sections.map((entry) => {
    const section = objectWithKeys(entry, ["heading", "text"]);
    return {
      heading: text(section.heading, 200),
      text: text(section.text, 10000),
    };
  });
  const media = raw.media.map((entry) => {
    const image = objectWithKeys(entry, [
      "publicId",
      "url",
      "alt",
      "width",
      "height",
    ]);
    return {
      publicId: publicId(image.publicId),
      url: approvedMediaUrl(image.url),
      alt: text(image.alt, 300),
      width: integer(image.width, 20000, 1),
      height: integer(image.height, 20000, 1),
    };
  });
  if (new Set(media.map((entry) => entry.publicId)).size !== media.length)
    catalogError(400, "INVALID_INPUT", "Immagini duplicate nella scheda.");
  const revenueCategory = text(raw.revenueCategory, 100);
  if (
    !["stampa3d", "consulenza", "sviluppoSoftware", "atlas", "altro"].includes(
      revenueCategory,
    )
  )
    catalogError(400, "INVALID_INPUT", "Scegli una categoria ricavo.");
  return {
    slug,
    title: text(raw.title, 200),
    summary: text(raw.summary, 1000),
    sections,
    media,
    priceSource: raw.priceSource as CatalogDraftInput["priceSource"],
    onlinePrice,
    taxMode: raw.taxMode as CatalogDraftInput["taxMode"],
    taxRate,
    fulfillmentModes:
      raw.fulfillmentModes as CatalogDraftInput["fulfillmentModes"],
    revenueCategory: revenueCategory as CatalogDraftInput["revenueCategory"],
    revenueVariant: text(raw.revenueVariant, 100),
  };
}
