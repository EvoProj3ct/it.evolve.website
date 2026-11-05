import "server-only";
import mongoose, { type ClientSession } from "mongoose";
import { assertCommerceSession } from "@evolve/ecommerce-server/persistence";
import { publicProductFromViews } from "@evolve/ecommerce-server/catalog";
import type { AtlasCommerceStorage } from "../persistence/atlas-storage";
import { approvedMediaUrl, catalogError, sourceFromRecord } from "./validation";

/** Future quote/order services must call inside their authenticated account transaction. No independent checkout is exposed here. */
export async function lockPublishedCatalogItem(
  context: AtlasCommerceStorage & { session: ClientSession; shopId: string },
  id: string,
  expectedPublishedRevision: number,
) {
  const { session, shopId } = context;
  assertCommerceSession(context.coreConnection, session);
  assertCommerceSession(context.commerceConnection, session);
  const listing = await context.internal.listings
    .findOne({
      shopId,
      publicId: id,
      enabled: true,
      publishedRevision: expectedPublishedRevision,
    })
    .session(session)
    .lean<any>();
  if (!listing || !listing.publishedAccounting)
    catalogError(
      409,
      "CATALOG_CHANGED",
      "Il prodotto è cambiato o non è più disponibile. Richiedi un nuovo riepilogo.",
    );
  const row = await context.coreConnection
    .db!.collection("anagrafiche__articoli")
    .findOne(
      { _id: listing.productId },
      {
        projection: {
          "data.nomeArticolo": 1,
          "data.codiceArticolo": 1,
          "data.prezzoUnitario": 1,
          "data.genereArticolo": 1,
        },
        session,
      },
    );
  if (!row || sourceFromRecord(row).hash !== listing.publishedSourceHash)
    catalogError(
      409,
      "CATALOG_CHANGED",
      "L’articolo sorgente è cambiato. Richiedi un nuovo riepilogo.",
    );
  const catalog = await context.storefront.catalogViews
    .findOne({
      shopId,
      publicId: id,
      publishedRevision: expectedPublishedRevision,
    })
    .session(session)
    .lean();
  const page = await context.storefront.productPageViews
    .findOne({
      shopId,
      publicId: id,
      publishedRevision: expectedPublishedRevision,
    })
    .session(session)
    .lean<any>();
  if (!catalog || !page)
    catalogError(409, "CATALOG_CHANGED", "Scheda pubblica non disponibile.");
  for (const media of page.content.media) approvedMediaUrl(media.url);
  const sourceFence = await context.coreConnection
    .db!.collection("anagrafiche__articoli")
    .updateOne(
      { _id: new mongoose.Types.ObjectId(String(listing.productId)) },
      { $inc: { commerceCatalogGuard: 1 } },
      { session },
    );
  const listingFence = await context.internal.listings.updateOne(
    {
      _id: listing._id,
      shopId,
      enabled: true,
      revision: listing.revision,
      publishedRevision: expectedPublishedRevision,
    },
    { $inc: { guard: 1 } },
    { session },
  );
  if (sourceFence.matchedCount !== 1 || listingFence.matchedCount !== 1)
    catalogError(
      409,
      "CATALOG_CHANGED",
      "Catalogo modificato durante la conferma.",
    );
  return {
    product: publicProductFromViews(catalog, page),
    revenue: {
      category: String(listing.publishedAccounting.category),
      variant: String(listing.publishedAccounting.variant),
    },
  };
}
