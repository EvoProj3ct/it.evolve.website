import type { PublicCatalogProduct } from "@evolve/ecommerce-server/catalog";
import { cartSchema, type PersonalizationInput, type SaveCart } from "./contracts";
import { StorefrontError, storefrontGet, storefrontMutate } from "./browser";

export async function addCatalogProduct(
  product: PublicCatalogProduct,
  personalization: PersonalizationInput | undefined,
  signal?: AbortSignal,
) {
  const current = await storefrontGet("/cart", cartSchema, signal);
  signal?.throwIfAborted();
  if (current.requiresReview || current.status === "expired" || current.status === "converted" ||
      current.items.some(item => item.state !== "available" || item.listingRevision === null)) {
    throw new StorefrontError("Controlla e conferma il carrello prima di aggiungere altri articoli.", 409, "CART_REVIEW_REQUIRED");
  }
  const found = !personalization && current.items.find(item => item.productPublicId === product.id && !item.personalizationId);
  if (found && found.listingRevision !== product.revision)
    throw new StorefrontError("La scheda è cambiata. Rivedi il prodotto e il carrello.", 409, "CATALOG_CHANGED");
  const items: SaveCart["items"] = current.items.map(item => ({
    productPublicId: item.productPublicId,
    listingRevision: item.listingRevision!,
    quantity: item.quantity + (item === found ? 1 : 0),
    personalizationId: item.personalizationId,
  }));
  if (!found) items.push({ productPublicId: product.id, listingRevision: product.revision, quantity: 1, personalization });
  return storefrontMutate("/cart/items", "PUT", { cartPublicId: current.id, expectedRevision: current.revision, items }, cartSchema);
}
