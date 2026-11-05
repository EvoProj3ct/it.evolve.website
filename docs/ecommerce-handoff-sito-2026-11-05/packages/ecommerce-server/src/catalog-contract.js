import { CommerceServiceError } from "./errors.js";

const invalid = () => {
  throw new CommerceServiceError(
    502,
    "CATALOG_RESPONSE_INVALID",
    "Scheda prodotto non disponibile.",
  );
};
function exact(value, keys) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key))
  )
    invalid();
}
const string = (value, max, min = 1) => {
  if (typeof value !== "string" || value.length < min || value.length > max)
    invalid();
  return value;
};
const int = (value, max = 1_000_000_000_000, min = 0) => {
  if (!Number.isSafeInteger(value) || value < min || value > max) invalid();
  return value;
};
export function catalogPublicId(value) {
  const id = string(value, 80, 16);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) invalid();
  return id;
}
export function catalogSlug(value) {
  const slug = string(value, 160);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) invalid();
  return slug;
}
function media(value) {
  exact(value, ["id", "url", "alt", "width", "height"]);
  const url = string(value.url, 2048);
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    invalid();
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  )
    invalid();
  return {
    id: catalogPublicId(value.id),
    url,
    alt: string(value.alt, 300),
    width: int(value.width, 20000, 1),
    height: int(value.height, 20000, 1),
  };
}
export function validatePublicCatalogProduct(value, withContent = false) {
  exact(value, [
    "id",
    "slug",
    "code",
    "name",
    "kind",
    "description",
    "price",
    "revision",
    "fulfillmentModes",
    "publishedAt",
    "image",
    ...(withContent ? ["content"] : []),
  ]);
  exact(value.price, [
    "currency",
    "unitAmountCents",
    "taxMode",
    "unitNetCents",
    "unitTaxCents",
    "unitGrossCents",
    "taxRateBasisPoints",
  ]);
  const price = value.price;
  if (
    price.currency !== "EUR" ||
    !["inclusive", "exclusive"].includes(price.taxMode)
  )
    invalid();
  for (const key of [
    "unitAmountCents",
    "unitNetCents",
    "unitTaxCents",
    "unitGrossCents",
  ])
    int(price[key]);
  int(price.taxRateBasisPoints, 10000);
  if (price.unitNetCents + price.unitTaxCents !== price.unitGrossCents)
    invalid();
  if (
    !["physical", "service"].includes(value.kind) ||
    !Array.isArray(value.fulfillmentModes) ||
    !value.fulfillmentModes.length ||
    value.fulfillmentModes.length > 3 ||
    value.fulfillmentModes.some(
      (mode) => !["shipping", "pickup", "service"].includes(mode),
    )
  )
    invalid();
  const publishedAt = string(value.publishedAt, 30);
  if (Number.isNaN(Date.parse(publishedAt))) invalid();
  const product = {
    id: catalogPublicId(value.id),
    slug: catalogSlug(value.slug),
    code: string(value.code, 100),
    name: string(value.name, 200),
    kind: value.kind,
    description: string(value.description, 1000),
    price: {
      currency: "EUR",
      unitAmountCents: price.unitAmountCents,
      taxMode: price.taxMode,
      unitNetCents: price.unitNetCents,
      unitTaxCents: price.unitTaxCents,
      unitGrossCents: price.unitGrossCents,
      taxRateBasisPoints: price.taxRateBasisPoints,
    },
    revision: int(value.revision, Number.MAX_SAFE_INTEGER),
    fulfillmentModes: [...value.fulfillmentModes],
    publishedAt,
    ...(value.image ? { image: media(value.image) } : {}),
  };
  if (!withContent) return product;
  exact(value.content, ["title", "summary", "sections", "media"]);
  if (
    !Array.isArray(value.content.sections) ||
    value.content.sections.length > 20 ||
    !Array.isArray(value.content.media) ||
    value.content.media.length > 20
  )
    invalid();
  return {
    ...product,
    content: {
      title: string(value.content.title, 200),
      summary: string(value.content.summary, 1000),
      sections: value.content.sections.map((section) => {
        exact(section, ["heading", "text"]);
        return {
          heading: string(section.heading, 200),
          text: string(section.text, 10000),
        };
      }),
      media: value.content.media.map(media),
    },
  };
}
export function validatePublicCatalogList(value) {
  exact(value, ["items", "nextCursor"]);
  if (!Array.isArray(value.items) || value.items.length > 50) invalid();
  return {
    items: value.items.map((entry) => validatePublicCatalogProduct(entry)),
    nextCursor:
      value.nextCursor === null ? null : catalogPublicId(value.nextCursor),
  };
}
export function publicProductFromViews(catalog, page, withContent = false) {
  if (
    !catalog ||
    !page ||
    catalog.publicId !== page.publicId ||
    catalog.publishedRevision !== page.publishedRevision
  )
    invalid();
  if (
    ["slug", "title", "code", "kind"].some(
      (key) => catalog[key] !== page[key],
    ) ||
    ["unitMinor", "taxMode", "taxRateBps", "currency"].some(
      (key) => catalog.price?.[key] !== page.price?.[key],
    )
  )
    invalid();
  const { unitMinor, taxMode, taxRateBps } = catalog.price;
  const base = BigInt(unitMinor),
    rate = BigInt(taxRateBps);
  const round = (n, d) => (BigInt(2) * n + d) / (BigInt(2) * d);
  const net =
    taxMode === "exclusive"
      ? base
      : round(base * BigInt(10000), BigInt(10000) + rate);
  const tax =
    taxMode === "exclusive" ? round(net * rate, BigInt(10000)) : base - net;
  const mappedMedia = page.content.media.map(
    ({ publicId, url, alt, width, height }) => ({
      id: publicId,
      url,
      alt,
      width,
      height,
    }),
  );
  return validatePublicCatalogProduct(
    {
      id: catalog.publicId,
      slug: catalog.slug,
      code: catalog.code,
      name: catalog.title,
      kind: catalog.kind,
      description: page.content.summary,
      price: {
        currency: "EUR",
        unitAmountCents: unitMinor,
        taxMode,
        unitNetCents: Number(net),
        unitTaxCents: Number(tax),
        unitGrossCents: Number(net + tax),
        taxRateBasisPoints: taxRateBps,
      },
      revision: catalog.publishedRevision,
      fulfillmentModes: catalog.fulfillmentModes,
      publishedAt: new Date(catalog.publishedAt).toISOString(),
      ...(mappedMedia[0] ? { image: mappedMedia[0] } : {}),
      ...(withContent
        ? {
            content: {
              title: page.content.title,
              summary: page.content.summary,
              sections: page.content.sections.map(({ heading, text }) => ({
                heading,
                text,
              })),
              media: mappedMedia,
            },
          }
        : {}),
    },
    withContent,
  );
}
export function parseCatalogQuery(url) {
  const params = new URL(url).searchParams;
  if (
    [...params.keys()].some((key) => !["limit", "cursor"].includes(key)) ||
    params.getAll("limit").length > 1 ||
    params.getAll("cursor").length > 1
  ) {
    throw new CommerceServiceError(
      400,
      "INVALID_QUERY",
      "Parametri del catalogo non validi.",
    );
  }
  const rawLimit = params.get("limit") || "20",
    cursor = params.get("cursor");
  if (
    !/^[1-9]\d?$/.test(rawLimit) ||
    Number(rawLimit) > 50 ||
    (cursor !== null && !/^[A-Za-z0-9_-]{16,80}$/.test(cursor))
  ) {
    throw new CommerceServiceError(
      400,
      "INVALID_QUERY",
      "Parametri del catalogo non validi.",
    );
  }
  return { limit: Number(rawLimit), ...(cursor ? { cursor } : {}) };
}
