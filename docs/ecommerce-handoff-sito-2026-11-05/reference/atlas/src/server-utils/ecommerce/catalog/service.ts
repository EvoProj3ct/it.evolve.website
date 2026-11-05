import "server-only";
import { randomUUID } from "node:crypto";
import mongoose, { type ClientSession } from "mongoose";
import { publicProductFromViews } from "@evolve/ecommerce-server/catalog";
import {
  CommerceServiceError,
  type CommerceServicePrincipal,
} from "@evolve/ecommerce-server/identity";
import {
  insertCommerceRecord,
  replaceCommerceRecord,
  withCommerceTransaction,
  type CommerceActor,
} from "@evolve/ecommerce-server/persistence";
import {
  getAtlasCommerceStorage,
  type AtlasCommerceStorage,
} from "../persistence/atlas-storage";
import { type CommerceStaffPrincipal } from "../staff-auth";
import {
  hasCommerceCapability,
  type CommerceCapability,
} from "@/config/access/ecommerce-access.config";
import {
  approvedMediaUrl,
  catalogError,
  decimalMinor,
  minorText,
  parseDraft,
  sourceFromRecord,
} from "./validation";
import type {
  CatalogDraftInput,
  CatalogEditorRecord,
  CatalogList,
  CatalogSource,
} from "./types";

const SOURCE_FIELDS = {
  "data.nomeArticolo": 1,
  "data.codiceArticolo": 1,
  "data.prezzoUnitario": 1,
  "data.genereArticolo": 1,
};
interface Tx extends AtlasCommerceStorage {
  session: ClientSession;
  shopId: string;
  actor: CommerceActor;
  sourceFilter: Record<string, any>;
}
function articles(tx: AtlasCommerceStorage): mongoose.Model<any> {
  const connection = tx.coreConnection;
  if (connection.models.CommerceCatalogArticle)
    return connection.models.CommerceCatalogArticle;
  const schema = new mongoose.Schema(
    {
      data: mongoose.Schema.Types.Mixed,
      owner: mongoose.Schema.Types.ObjectId,
      visibilityRoles: [String],
    },
    {
      strict: "throw",
      autoIndex: false,
      autoCreate: false,
      bufferCommands: false,
    },
  );
  return connection.model(
    "CommerceCatalogArticle",
    schema,
    "anagrafiche__articoli",
  );
}
async function source(
  tx: Tx,
  productId: unknown,
  staffScoped = true,
): Promise<CatalogSource | null> {
  const row = await articles(tx)
    .findOne({ $and: [{ _id: productId }, staffScoped ? tx.sourceFilter : {}] })
    .select(SOURCE_FIELDS)
    .session(tx.session)
    .lean();
  return row ? sourceFromRecord(row) : null;
}
async function audit(tx: Tx, action: string, id: string, reasonCode?: string) {
  await insertCommerceRecord(
    tx.internal.auditEvents,
    {
      shopId: tx.shopId,
      actor: tx.actor,
      action,
      objectType: "listing",
      objectId: id,
      outcome: "succeeded",
      occurredAt: new Date(),
      ...(reasonCode ? { reasonCode } : {}),
    },
    tx.session,
  );
}
function translatedError(error: unknown): never {
  if (error instanceof CommerceServiceError) throw error;
  if ((error as { code?: number })?.code === 11000)
    catalogError(
      409,
      "CATALOG_CONFLICT",
      "Slug o articolo già utilizzato. Ricarica il catalogo e verifica i dati.",
    );
  const message = error instanceof Error ? error.message : "";
  if (message === "COMMERCE_REVISION_CONFLICT")
    catalogError(
      409,
      "REVISION_CONFLICT",
      "La scheda è stata modificata. Ricaricala prima di continuare.",
    );
  if (
    /^COMMERCE_(?:SCHEMA|INDEX|MIGRATION|CORE_INDEX|DATABASE|REPLICA|SESSIONS|SHARED)/.test(
      message,
    )
  ) {
    catalogError(
      503,
      "CATALOG_STORAGE_NOT_READY",
      "Archivio e-commerce da predisporre o verificare.",
    );
  }
  throw error;
}
async function staffWork<T>(
  staff: CommerceStaffPrincipal,
  capability: CommerceCapability,
  requestId: string,
  work: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (staff.kind !== "staff" || !hasCommerceCapability(staff.role, capability))
    catalogError(403, "STAFF_ACCESS_DENIED", "Operazione non consentita.");
  try {
    // These modules belong to staff ACL only; OIDC catalog reads never import key/user models.
    const { buildMongoAccessFilter } = await import(
      "@/server-utils/access/access-engine"
    );
    const { loadUserKeyScopes } = await import(
      "@/server-utils/access/load-key-scopes"
    );
    const isAdmin = staff.role === "Super" || staff.role === "Amministrazione";
    const sourceFilter = buildMongoAccessFilter(
      {
        userId: staff.userId,
        role: staff.role,
        isAdmin,
        ...(!isAdmin
          ? { keyScopes: await loadUserKeyScopes(staff.userId) }
          : {}),
      },
      "articoli",
    );
    const storage = await getAtlasCommerceStorage();
    return await withCommerceTransaction(storage.coreConnection, (session) =>
      work({
        ...storage,
        session,
        shopId: process.env.ECOMMERCE_SHOP_ID!,
        sourceFilter,
        actor: { kind: "staff", id: staff.userId, requestId },
      }),
    );
  } catch (error) {
    return translatedError(error);
  }
}
async function findListing(tx: Tx, id: string) {
  const listing = await tx.internal.listings
    .findOne({ shopId: tx.shopId, publicId: id })
    .session(tx.session)
    .lean<any>();
  if (!listing)
    catalogError(404, "LISTING_NOT_FOUND", "Scheda non disponibile.");
  const current = await source(tx, listing.productId);
  if (
    !current &&
    (await articles(tx).exists({ _id: listing.productId }).session(tx.session))
  )
    catalogError(
      403,
      "SOURCE_ACCESS_DENIED",
      "Articolo non accessibile al tuo profilo.",
    );
  return { listing, current };
}
function checkVersion(listing: any, expectedVersion: number) {
  if (listing.revision !== expectedVersion)
    catalogError(
      409,
      "REVISION_CONFLICT",
      "La scheda è stata modificata. Ricaricala prima di continuare.",
    );
}
function checkSource(
  current: CatalogSource | null,
  hash: string,
): asserts current is CatalogSource {
  if (!current || current.hash !== hash)
    catalogError(
      409,
      "SOURCE_CHANGED",
      "L’articolo sorgente è cambiato o non è disponibile. Ricarica e verifica la scheda.",
    );
}
function inputFromStored(draft: any): CatalogDraftInput | null {
  if (!draft) return null;
  return {
    slug: draft.slug,
    title: draft.content.title,
    summary: draft.content.summary,
    sections: draft.content.sections.map(({ heading, text }: any) => ({
      heading,
      text,
    })),
    media: draft.content.media.map(
      ({ publicId, url, alt, width, height }: any) => ({
        publicId,
        url,
        alt,
        width,
        height,
      }),
    ),
    priceSource: draft.priceSource,
    onlinePrice:
      draft.priceSource === "online_override"
        ? minorText(draft.price.unitMinor)
        : "",
    taxMode: draft.price.taxMode,
    taxRate: minorText(draft.price.taxRateBps),
    fulfillmentModes: [...draft.fulfillmentModes],
    revenueCategory: draft.revenueCategory,
    revenueVariant: draft.revenueVariant,
  };
}
async function editor(
  tx: Tx,
  listing: any,
  current: CatalogSource | null,
): Promise<CatalogEditorRecord> {
  const catalog = await tx.storefront.catalogViews
    .findOne({ shopId: tx.shopId, publicId: listing.publicId })
    .session(tx.session)
    .lean();
  const page = await tx.storefront.productPageViews
    .findOne({ shopId: tx.shopId, publicId: listing.publicId })
    .session(tx.session)
    .lean();
  return {
    id: listing.publicId,
    version: listing.revision,
    enabled: listing.enabled,
    publishedRevision: listing.publishedRevision ?? null,
    source: current,
    sourceChanged:
      !current ||
      (!!listing.enabled && current.hash !== listing.publishedSourceHash) ||
      (!!listing.draft && current.hash !== listing.draft.sourceRevisionHash),
    draft: inputFromStored(listing.draft),
    published:
      catalog && page ? publicProductFromViews(catalog, page, true) : null,
  };
}
export function listCatalogSources(
  staff: CommerceStaffPrincipal,
  q: string,
  cursor: string | undefined,
  requestId: string,
) {
  return staffWork(staff, "ecommerce.catalog.edit", requestId, async (tx) => {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter = {
      $and: [
        tx.sourceFilter,
        ...(cursor
          ? [{ _id: { $gt: new mongoose.Types.ObjectId(cursor) } }]
          : []),
        ...(q
          ? [
              {
                $or: [
                  { "data.nomeArticolo": { $regex: escaped, $options: "i" } },
                  { "data.codiceArticolo": { $regex: escaped, $options: "i" } },
                ],
              },
            ]
          : []),
      ],
    };
    const rows = await articles(tx)
      .find(filter)
      .select(SOURCE_FIELDS)
      .sort({ _id: 1 })
      .limit(21)
      .session(tx.session)
      .lean();
    return {
      items: rows.slice(0, 20).map(sourceFromRecord),
      nextCursor: rows.length > 20 ? String(rows[19]._id) : null,
    };
  });
}
export function listStaffCatalog(
  staff: CommerceStaffPrincipal,
  cursor: string | undefined,
  requestId: string,
): Promise<CatalogList> {
  return staffWork(staff, "ecommerce.catalog.view", requestId, async (tx) => {
    const rows = await tx.internal.listings
      .find({
        shopId: tx.shopId,
        ...(cursor ? { publicId: { $gt: cursor } } : {}),
      })
      .select({
        publicId: 1,
        productId: 1,
        revision: 1,
        enabled: 1,
        draftRevision: 1,
        publishedRevision: 1,
        publishedSourceHash: 1,
        "draft.content.title": 1,
      })
      .sort({ publicId: 1 })
      .limit(51)
      .session(tx.session)
      .lean<any[]>();
    const sourceRows = await articles(tx)
      .find({
        $and: [
          tx.sourceFilter,
          {
            _id: { $in: rows.slice(0, 50).map((listing) => listing.productId) },
          },
        ],
      })
      .select(SOURCE_FIELDS)
      .session(tx.session)
      .lean();
    const sourceMap = new Map(
      sourceRows.map((row) => {
        const item = sourceFromRecord(row);
        return [item.id, item] as const;
      }),
    );
    const items: CatalogList["items"] = [];
    for (const listing of rows.slice(0, 50)) {
      const current = sourceMap.get(String(listing.productId));
      if (!current && tx.sourceFilter && Object.keys(tx.sourceFilter).length)
        continue;
      items.push({
        id: listing.publicId,
        productName:
          listing.draft?.content.title ||
          current?.name ||
          "Articolo sorgente rimosso",
        code: current?.code || "",
        version: listing.revision,
        enabled: listing.enabled,
        hasDraft: !!listing.draft,
        draftChanged:
          !!listing.draft &&
          listing.draftRevision > (listing.publishedRevision ?? -1),
        sourceChanged:
          !current ||
          (!!listing.enabled && current.hash !== listing.publishedSourceHash),
      });
    }
    return { items, nextCursor: rows.length > 50 ? rows[49].publicId : null };
  });
}
export function getStaffListing(
  staff: CommerceStaffPrincipal,
  id: string,
  requestId: string,
) {
  return staffWork(staff, "ecommerce.catalog.view", requestId, async (tx) => {
    const { listing, current } = await findListing(tx, id);
    return editor(tx, listing, current);
  });
}
export function createListing(
  staff: CommerceStaffPrincipal,
  productId: string,
  requestId: string,
) {
  return staffWork(staff, "ecommerce.catalog.edit", requestId, async (tx) => {
    const current = await source(tx, new mongoose.Types.ObjectId(productId));
    if (!current)
      catalogError(
        404,
        "SOURCE_NOT_FOUND",
        "Articolo non disponibile per la configurazione.",
      );
    let listing = await tx.internal.listings
      .findOne({ shopId: tx.shopId, productId })
      .session(tx.session)
      .lean<any>();
    if (!listing) {
      const created = await insertCommerceRecord(
        tx.internal.listings,
        {
          shopId: tx.shopId,
          publicId: randomUUID(),
          productId,
          enabled: false,
          draftRevision: 0,
          actor: tx.actor,
        },
        tx.session,
      );
      listing = created.toObject();
      await audit(tx, "catalog.created", listing.publicId);
    }
    return editor(tx, listing, current);
  });
}
export function saveCatalogDraft(
  staff: CommerceStaffPrincipal,
  id: string,
  version: number,
  hash: string,
  input: CatalogDraftInput,
  requestId: string,
) {
  return staffWork(staff, "ecommerce.catalog.edit", requestId, async (tx) => {
    const { listing, current } = await findListing(tx, id);
    checkVersion(listing, version);
    checkSource(current, hash);
    if (!current.kind)
      catalogError(
        400,
        "SOURCE_KIND_REQUIRED",
        "Definisci nell’articolo se si tratta di un prodotto fisico o di un servizio.",
      );
    if (
      current.kind === "service"
        ? input.fulfillmentModes.some((mode) => mode !== "service")
        : input.fulfillmentModes.includes("service")
    ) {
      catalogError(
        400,
        "INVALID_FULFILLMENT",
        "Le modalità di evasione devono corrispondere al tipo di articolo.",
      );
    }
    if (input.priceSource === "source" && current.sourcePrice === null)
      catalogError(
        400,
        "SOURCE_PRICE_REQUIRED",
        "L’articolo non ha un prezzo valido con al massimo due decimali.",
      );
    const draft = {
      slug: input.slug,
      content: {
        title: input.title,
        summary: input.summary,
        sections: input.sections,
        media: input.media,
      },
      kind: current.kind,
      priceSource: input.priceSource,
      sourceRevisionHash: current.hash,
      price: {
        unitMinor: decimalMinor(
          input.priceSource === "source"
            ? current.sourcePrice!
            : input.onlinePrice,
        ),
        taxMode: input.taxMode,
        taxRateBps: decimalMinor(input.taxRate, 10000),
        currency: "EUR",
      },
      fulfillmentModes: input.fulfillmentModes,
      revenueCategory: input.revenueCategory,
      revenueVariant: input.revenueVariant,
    };
    const updated = await replaceCommerceRecord(
      tx.internal.listings,
      { shopId: tx.shopId, id: String(listing._id), expectedRevision: version },
      { draft, draftRevision: version + 1, actor: tx.actor },
      tx.session,
    );
    await audit(tx, "catalog.draft_saved", id);
    return editor(tx, updated.toObject(), current);
  });
}

function compile(
  listing: any,
  current: CatalogSource,
  revision: number,
  publishedAt: Date,
) {
  const draft = listing.draft;
  if (!draft)
    catalogError(400, "DRAFT_REQUIRED", "Salva prima la bozza della scheda.");
  checkSource(current, draft.sourceRevisionHash);
  if (!current.code || current.code.length > 100)
    catalogError(
      400,
      "SOURCE_CODE_REQUIRED",
      "Definisci un codice articolo di massimo 100 caratteri.",
    );
  if (draft.price.unitMinor <= 0)
    catalogError(
      400,
      "POSITIVE_PRICE_REQUIRED",
      "Il prezzo di vendita deve essere maggiore di zero.",
    );
  // Revalidate persisted drafts/media too, rather than trusting earlier API validation.
  parseDraft(inputFromStored(draft));
  const base = {
    publicId: listing.publicId,
    slug: draft.slug,
    publishedRevision: revision,
    title: draft.content.title,
    code: current.code,
    kind: draft.kind,
    price: { ...draft.price },
    fulfillmentModes: [...draft.fulfillmentModes],
    publishedAt,
  };
  const page = { ...base, content: draft.content };
  return {
    catalog: base,
    page,
    preview: publicProductFromViews(base, page, true),
  };
}
async function fenceSource(tx: Tx, current: CatalogSource) {
  const result = await tx.coreConnection
    .db!.collection("anagrafiche__articoli")
    .updateOne(
      { _id: new mongoose.Types.ObjectId(current.id) },
      { $inc: { commerceCatalogGuard: 1 } },
      { session: tx.session },
    );
  if (result.matchedCount !== 1)
    catalogError(
      409,
      "SOURCE_CHANGED",
      "Articolo modificato durante l’operazione.",
    );
}
export function previewCatalogDraft(
  staff: CommerceStaffPrincipal,
  id: string,
  version: number,
  hash: string,
  requestId: string,
) {
  return staffWork(staff, "ecommerce.catalog.edit", requestId, async (tx) => {
    const { listing, current } = await findListing(tx, id);
    checkVersion(listing, version);
    checkSource(current, hash);
    return compile(listing, current, version + 1, new Date()).preview;
  });
}
async function writeView(
  tx: Tx,
  model: mongoose.Model<any>,
  view: Record<string, any>,
) {
  const previous = await model
    .findOne({ shopId: tx.shopId, publicId: view.publicId })
    .session(tx.session)
    .lean<any>();
  if (!previous)
    return insertCommerceRecord(
      model,
      { shopId: tx.shopId, ...view },
      tx.session,
    );
  const { publicId: ignored, ...patch } = view;
  void ignored;
  return replaceCommerceRecord(
    model,
    {
      shopId: tx.shopId,
      id: String(previous._id),
      expectedRevision: previous.revision,
    },
    patch,
    tx.session,
  );
}
export function publishCatalogListing(
  staff: CommerceStaffPrincipal,
  id: string,
  version: number,
  hash: string,
  mediaApproved: boolean,
  requestId: string,
) {
  return staffWork(
    staff,
    "ecommerce.catalog.publish",
    requestId,
    async (tx) => {
      const { listing, current } = await findListing(tx, id);
      checkVersion(listing, version);
      checkSource(current, hash);
      const publishedAt = new Date(),
        compiled = compile(listing, current, version + 1, publishedAt);
      if (listing.draft.content.media.length && !mediaApproved)
        catalogError(
          400,
          "MEDIA_APPROVAL_REQUIRED",
          "Conferma che le immagini selezionate possono essere pubblicate sul sito.",
        );
      await fenceSource(tx, current);
      const updated = await replaceCommerceRecord(
        tx.internal.listings,
        {
          shopId: tx.shopId,
          id: String(listing._id),
          expectedRevision: version,
        },
        {
          enabled: true,
          publishedRevision: version + 1,
          publishedSourceHash: current.hash,
          publishedAccounting: {
            category: listing.draft.revenueCategory,
            variant: listing.draft.revenueVariant,
          },
          publishedAt,
          guard: listing.guard + 1,
          actor: tx.actor,
        },
        tx.session,
      );
      await writeView(tx, tx.storefront.catalogViews, compiled.catalog);
      await writeView(tx, tx.storefront.productPageViews, compiled.page);
      await audit(
        tx,
        "catalog.published",
        id,
        mediaApproved ? "MEDIA_APPROVED" : undefined,
      );
      return editor(tx, updated.toObject(), current);
    },
  );
}
async function withdraw(tx: Tx, listing: any, reason: string) {
  const updated = await replaceCommerceRecord(
    tx.internal.listings,
    {
      shopId: tx.shopId,
      id: String(listing._id),
      expectedRevision: listing.revision,
    },
    { enabled: false, guard: listing.guard + 1, actor: tx.actor },
    tx.session,
  );
  await tx.storefront.catalogViews
    .deleteMany({ shopId: tx.shopId, publicId: listing.publicId })
    .session(tx.session);
  await tx.storefront.productPageViews
    .deleteMany({ shopId: tx.shopId, publicId: listing.publicId })
    .session(tx.session);
  await audit(tx, "catalog.withdrawn", listing.publicId, reason);
  return updated.toObject();
}
export function withdrawCatalogListing(
  staff: CommerceStaffPrincipal,
  id: string,
  version: number,
  requestId: string,
) {
  return staffWork(
    staff,
    "ecommerce.catalog.publish",
    requestId,
    async (tx) => {
      const { listing, current } = await findListing(tx, id);
      checkVersion(listing, version);
      const updated = await withdraw(tx, listing, "STAFF_REQUEST");
      return editor(tx, updated, current);
    },
  );
}

/** Called only by fixed OIDC routes. The caller cannot choose a shop or read drafts/core records. */
export async function readPublishedCatalog(
  principal: CommerceServicePrincipal,
  query: { limit?: number; cursor?: string; id?: string; slug?: string },
  requestId: string,
) {
  try {
    const storage = await getAtlasCommerceStorage();
    if (
      principal.kind !== "service" ||
      principal.service !== "storefront-site" ||
      principal.shopId !== process.env.ECOMMERCE_SHOP_ID
    )
      catalogError(
        403,
        "SHOP_ACCESS_DENIED",
        "Accesso al negozio non consentito.",
      );
    return await withCommerceTransaction(
      storage.coreConnection,
      async (session) => {
        const tx: Tx = {
          ...storage,
          session,
          sourceFilter: {},
          shopId: principal.shopId,
          actor: { kind: "system", id: "catalog-reader", requestId },
        };
        let id = query.id;
        if (query.slug) {
          const page = await tx.storefront.productPageViews
            .findOne({ shopId: tx.shopId, slug: query.slug })
            .session(session)
            .lean<any>();
          if (!page) return null;
          id = page.publicId;
        }
        const limit = query.limit || 20;
        const rows = await tx.internal.listings
          .find({
            shopId: tx.shopId,
            enabled: true,
            ...(id
              ? { publicId: id }
              : query.cursor
                ? { publicId: { $gt: query.cursor } }
                : {}),
          })
          .select({
            publicId: 1,
            productId: 1,
            enabled: 1,
            revision: 1,
            publishedRevision: 1,
            publishedSourceHash: 1,
            guard: 1,
          })
          .sort({ publicId: 1 })
          .limit(id ? 1 : limit + 1)
          .session(session)
          .lean<any[]>();
        const selected = rows.slice(0, id ? 1 : limit);
        // Sequential batches on one session, rather than a DB round-trip per product.
        const sourceRows = await articles(tx)
          .find({ _id: { $in: selected.map((listing) => listing.productId) } })
          .select(SOURCE_FIELDS)
          .session(session)
          .lean();
        const catalogs = await tx.storefront.catalogViews
          .find({
            shopId: tx.shopId,
            publicId: { $in: selected.map((listing) => listing.publicId) },
          })
          .session(session)
          .lean<any[]>();
        const pages = await tx.storefront.productPageViews
          .find({
            shopId: tx.shopId,
            publicId: { $in: selected.map((listing) => listing.publicId) },
          })
          .select(query.slug ? {} : { "content.sections": 0 })
          .session(session)
          .lean<any[]>();
        const sourceMap = new Map(
          sourceRows.map((row) => {
            const item = sourceFromRecord(row);
            return [item.id, item] as const;
          }),
        );
        const catalogMap = new Map(
          catalogs.map((item) => [item.publicId, item] as const),
        );
        const pageMap = new Map(
          pages.map((item) => [item.publicId, item] as const),
        );
        const items = [];
        for (const listing of rows.slice(0, id ? 1 : limit)) {
          const current = sourceMap.get(String(listing.productId));
          const catalog = catalogMap.get(listing.publicId);
          const page = pageMap.get(listing.publicId);
          let validMedia = true;
          try {
            for (const image of page?.content?.media || [])
              approvedMediaUrl(image.url);
          } catch {
            validMedia = false;
          }
          if (
            !current ||
            current.hash !== listing.publishedSourceHash ||
            !catalog ||
            !page ||
            !validMedia ||
            catalog.publishedRevision !== listing.publishedRevision ||
            page.publishedRevision !== listing.publishedRevision
          ) {
            await withdraw(
              tx,
              listing,
              !validMedia
                ? "PUBLIC_MEDIA_REVOKED"
                : "SOURCE_OR_PROJECTION_CHANGED",
            );
            continue;
          }
          items.push(
            query.slug
              ? publicProductFromViews(catalog, page, true)
              : publicProductFromViews(catalog, page),
          );
        }
        if (id) return items[0] || null;
        return {
          items,
          nextCursor: rows.length > limit ? rows[limit - 1].publicId : null,
        };
      },
    );
  } catch (error) {
    return translatedError(error);
  }
}
